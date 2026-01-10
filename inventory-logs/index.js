import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

console.log("Gemini key loaded:", !!process.env.GEMINI_API_KEY);


const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3003;

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});


/**
 * =========================
 * GET INVENTORY LOGS
 * =========================
 */
app.get("/api/inventory-logs", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("inventory_logs")
      .select(`
        id,
        product_id,
        change,
        reason,
        ref_table,
        ref_id,
        created_by,
        created_at,
        metadata,
        unit_cost,
        total_cost,
        product:products!inventory_logs_product_id_fkey(name),
        user:users!inventory_logs_created_by_fkey(full_name)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const logs = data.map((log) => ({
      id: log.id,
      product: log.product?.name || "N/A",
      change: log.change,
      reason: log.reason,
      created_by_name: log.user?.full_name || "System",
      created_at: log.created_at,
      metadata: {
        previous_stock: log.metadata?.previous_stock ?? null,
        new_stock: log.metadata?.new_stock ?? null,
        // ✅ Fallback to columns if metadata is missing
        unit_cost: log.metadata?.unit_cost ?? log.unit_cost ?? 0,
        total_cost_impact: log.metadata?.total_cost_impact ?? log.total_cost ?? 0,
      },
    }));

    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

/**
 * =========================
 * CREATE INVENTORY LOG
 * =========================
 */
app.post("/api/inventory-logs", async (req, res) => {
  try {
    const { product_id, change, reason, ref_table, ref_id, created_by } = req.body;

    // Get product info
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("stock, cost")
      .eq("product_id", product_id)
      .single();

    if (productError) throw productError;

    const previousStock = product.stock;
    const newStock = previousStock + change;
    const unitCost = product.cost || 0;
    const totalCostImpact = change * unitCost;

    // Insert inventory log
    const { data: log, error: logError } = await supabase
      .from("inventory_logs")
      .insert([
        {
          product_id,
          change,
          reason,
          ref_table,
          ref_id,
          created_by,
          metadata: {
            previous_stock: previousStock,
            new_stock: newStock,
            unit_cost: unitCost,
            total_cost_impact: totalCostImpact
          },
          unit_cost: unitCost,
          total_cost: totalCostImpact
        }
      ])
      .select()
      .single();

    if (logError) throw logError;

    // Update product stock
    await supabase.rpc("update_product_stock", {
      p_product_id: product_id,
      p_change: change
    });

    // Insert audit log
    await supabase.from("audit_logs").insert({
      user_id: created_by,
      action: "INVENTORY_UPDATE",
      table_name: "products",
      row_id: product_id,
      payload: {
        change,
        reason,
        unit_cost: unitCost,
        total_cost_impact: totalCostImpact
      },
      created_at: new Date().toISOString()
    });

    res.json({
      status: "success",
      message: "Inventory updated with cost-aware audit log",
      log
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

/**
 * =========================
 * GENERIC AUDIT LOG
 * =========================
 */
app.post("/api/log-action", async (req, res) => {
  try {
    const { table, action, rowId, payload, userId } = req.body;

    const { data, error } = await supabase
      .from("audit_logs")
      .insert([
        {
          user_id: userId || null,
          action,
          table_name: table,
          row_id: rowId,
          payload,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;

    res.json({ status: "success", log: data });
  } catch (err) {
    console.error("Audit log error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

app.get("/api/ai/test", async (req, res) => {
  try {
    const prompt = "Respond with a short sentence confirming that you are working.";

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });

    const text = result.text;

    res.json({
      status: "success",
      response: text
    });
  } catch (err) {
    console.error("Gemini error:", err);
    res.status(500).json({
      status: "error",
      message: err.message
    });
  }
});



/**
 * =========================
 * START SERVER
 * =========================
 */
app.listen(PORT, () => {
  console.log(`Inventory + Audit Logs service running on port ${PORT}`);
});

/**
 * =========================
 * 🧠 GEMINI FORECAST ENDPOINT (IMPROVED)
 * =========================
 */
app.post("/api/ai/forecast", async (req, res) => {
  try {
    const { product_id, days = 7 } = req.body;

    console.log(`[AI] Request received for Product ID: ${product_id}`);

    if (!product_id) return res.status(400).json({ error: "Product ID required" });

    // 1. Fetch historical usage (Stock Out only)
    const { data: logs, error } = await supabase
      .from("inventory_logs")
      .select("created_at, change")
      .eq("product_id", product_id)
      .lt("change", 0)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // 2. Validate Data
    // We lowered the limit to 3 to help you test, but in production, 10+ is better
    if (!logs || logs.length < 3) {
      console.log("[AI] Failed: Not enough logs.");
      return res.json({ 
        status: "insufficient_data", 
        message: `Found only ${logs?.length || 0} sales records. Need at least 3 to predict.` 
      });
    }

    // 3. Aggregate data by day
    const dailyUsage = {};
    logs.forEach(log => {
      const date = new Date(log.created_at).toISOString().split('T')[0];
      const quantity = Math.abs(log.change);
      dailyUsage[date] = (dailyUsage[date] || 0) + quantity;
    });

    const historyArray = Object.entries(dailyUsage)
      .map(([date, qty]) => ({ date, qty }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Safety check for single-day data
    if (historyArray.length < 2) {
        return res.json({ 
            status: "insufficient_data", 
            message: "All sales are on the same day. Spread data over different days to see a trend." 
        });
    }

    // ======================================================
    // 🚀 IMPROVEMENT 1: CALCULATE MATH BASELINE
    // ======================================================
    const totalQty = historyArray.reduce((sum, item) => sum + item.qty, 0);
    const averageQty = (totalQty / historyArray.length).toFixed(2);

    // ======================================================
    // 🚀 IMPROVEMENT 2: ADD "DAY OF WEEK" CONTEXT
    // ======================================================
    // We format the data so Gemini sees: "2023-01-01 (Sunday): 5 sold"
    const historyContext = historyArray.slice(-45).map(h => {
        const dateObj = new Date(h.date);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
        return `- ${h.date} (${dayName}): ${h.qty} units`;
    }).join("\n");

    // 4. Construct Highly Detailed Prompt
    const prompt = `
      You are an expert inventory planner. 
      Your goal is to predict daily sales for the next ${days} days.

      ### HISTORICAL DATA (Past Sales)
      ${historyContext}

      ### STATISTICS
      - The mathematical average daily sales is: ${averageQty} units.

      ### INSTRUCTIONS
      1. Analyze the history for trends (is it increasing?) and seasonality (are weekends busier?).
      2. If the data looks random, stick close to the average (${averageQty}).
      3. If there is a clear trend, follow it.
      4. Return ONLY a JSON array with the prediction.

      ### OUTPUT FORMAT
      [{"date": "YYYY-MM-DD", "predicted_qty": 0}, ...]
    `;

    // 5. Call Gemini with Temperature 0 (Strict Mode)
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0,        // 0.0 = Deterministic (Consistent results)
        topP: 0.1,            // Focus on most likely outcomes
        responseMimeType: "application/json"
      }
    });

    // 6. Clean and Parse Response
    let rawText = result.text.replace(/```json/g, "").replace(/```/g, "").trim();
    const forecast = JSON.parse(rawText);

    console.log(`[AI] Forecast generated successfully. Baseline avg: ${averageQty}`);

    res.json({
      status: "success",
      history: historyArray.slice(-30),
      forecast: forecast
    });

  } catch (err) {
    console.error("[AI] Critical Error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});