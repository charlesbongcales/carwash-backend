// index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

/* ================================
   Appointment System Compatible
   ================================ */

// Get all service categories
export const getAllServicesCategories = async (req, res) => {
  try {
    const { data, error } = await supabase.from("services_category").select("*");
    if (error) throw error;
    return res.status(200).json({ services: data });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Error fetching services" });
  }
};

// Get active basic services by category
export const getBasicServices = async (req, res) => {
  try {
    const { services_category_id } = req.body;
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("services_category_id", services_category_id)
      .eq("active", true);

    if (error) throw error;
    return res.status(200).json({ services: data });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Error fetching services" });
  }
};

// Get premium wax + carwash services
export const getPremiumWaxWithCarwashServices = async (req, res) => {
  try {
    const { services_category_id } = req.body;
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("services_category_id", services_category_id)
      .eq("active", true);

    if (error) throw error;
    return res.status(200).json({ services: data });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Error fetching services" });
  }
};

// Get price for a specific service
export const getPrice = async (req, res) => {
  try {
    const { service_id } = req.body;
    const { data, error } = await supabase
      .from("services")
      .select("small, medium, large, xlarge, xxlarge")
      .eq("service_id", service_id)
      .single();

    if (error) throw error;
    return res.status(200).json({ prices: data });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Error fetching prices" });
  }
};

/* ========= NEW ROUTES YOU ASKED FOR ========= */

// Get major services
export const getMajorServices = async (req, res) => {
  try {
    const { services_category_id } = req.body;
    const { data: services, error } = await supabase
      .from("services")
      .select("*")
      .eq("services_category_id", services_category_id)
      .eq("active", true);

    if (error) throw error;
    return res.status(200).json({ services });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: "Error fetching services" });
  }
};

// Get ceramic coating services
export const getCeramicCoatingServices = async (req, res) => {
  try {
    const { services_category_id } = req.body;
    const { data: services, error } = await supabase
      .from("services")
      .select("*")
      .eq("services_category_id", services_category_id)
      .eq("active", true);

    if (error) throw error;
    return res.status(200).json({ services });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: "Error fetching services" });
  }
};

// Fetch service details
export const fetchServiceDetails = async (req, res) => {
  try {
    const { service_id } = req.query;
    const { data: service, error } = await supabase
      .from("services")
      .select("*, services_category(category_name)")
      .eq("service_id", service_id)
      .single();

    if (error) {
      return res.status(404).json({ message: "Service fetch fail" });
    }

    return res.status(200).json({ message: "Service details fetched", service });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: "Error fetching service" });
  }
};

/* =========================
   ROUTES for Appointment
   ========================= */
app.get("/getAllAvailableServices", getAllServicesCategories);
app.post("/getBasicServices", getBasicServices);
app.post("/getPremiumWaxWithCarwashServices", getPremiumWaxWithCarwashServices);
app.post("/getPrice", getPrice);

// ✅ New endpoints added
app.post("/getMajorServices", getMajorServices);
app.post("/getCeramicCoatingServices", getCeramicCoatingServices);
app.get("/fetchServiceDetails", fetchServiceDetails);

/* ======================
   SERVICE CATEGORIES CRUD
   ====================== */
app.get("/api/service-categories", async (req, res) => {
  const { data, error } = await supabase.from("services_category").select("*");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/service-categories", async (req, res) => {
  const { category_name } = req.body;
  const { data, error } = await supabase
    .from("services_category")
    .insert([{ category_name }])
    .select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

app.put("/api/service-categories/:id", async (req, res) => {
  const { id } = req.params;
  const { category_name } = req.body;
  const { data, error } = await supabase
    .from("services_category")
    .update({ category_name })
    .eq("services_category_id", id)
    .select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

app.delete("/api/service-categories/:id", async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from("services_category").delete().eq("services_category_id", id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "Category deleted" });
});

/* ============ SERVICES CRUD ============ */
app.get("/api/services", async (req, res) => {
  const { data, error } = await supabase.from("services").select("*, services_category(category_name)");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/services", async (req, res) => {
  const { service_name, services_category_id, small, medium, large, xlarge, xxlarge } = req.body;
  const { data, error } = await supabase
    .from("services")
    .insert([{ service_name, services_category_id, small, medium, large, xlarge, xxlarge }])
    .select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

app.put("/api/services/:id", async (req, res) => {
  const { id } = req.params;
  const { service_name, services_category_id, small, medium, large, xlarge, xxlarge, active } = req.body;
  const { data, error } = await supabase
    .from("services")
    .update({ service_name, services_category_id, small, medium, large, xlarge, xxlarge, active })
    .eq("service_id", id)
    .select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

app.delete("/api/services/:id", async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from("services").delete().eq("service_id", id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "Service deleted" });
});

/* ========== VARIANTS ========== */
app.get("/api/variants", async (req, res) => {
  const { data, error } = await supabase.from("variants").select("*");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/variants", async (req, res) => {
  const { name } = req.body;
  const { data, error } = await supabase.from("variants").insert([{ name }]).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

/* ================== SERVICE-PRODUCTS ================== */
app.post("/api/service-products/assign", async (req, res) => {
  const { service_id, product_id, variant_id, quantity } = req.body;
  const { data, error } = await supabase.from("service_products").insert([{ service_id, product_id, variant_id, quantity }]).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "Product assigned successfully", data });
});

app.get("/api/service-products/:service_id/:variant_id", async (req, res) => {
  const { service_id, variant_id } = req.params;
  const { data, error } = await supabase
    .from("service_products")
    .select("*, products(name, stock), variants(name)")
    .eq("service_id", service_id)
    .eq("variant_id", variant_id);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/* ======================== APPLY SERVICE (Auto-deduct) ======================== */
app.post("/api/service-products/apply", async (req, res) => {
  try {
    const { service_id, variant_id } = req.body;

    const { data: serviceProducts, error: spError } = await supabase
      .from("service_products")
      .select("product_id, quantity, products(stock)")
      .eq("service_id", service_id)
      .eq("variant_id", variant_id);

    if (spError) throw spError;
    if (!serviceProducts || serviceProducts.length === 0) {
      return res.status(400).json({ message: "No products linked for this service/variant." });
    }

    for (const sp of serviceProducts) {
      const newStock = sp.products.stock - sp.quantity;
      if (newStock < 0) {
        return res.status(400).json({ message: `Not enough stock for product ${sp.product_id}` });
      }

      const { error: updateError } = await supabase.from("products").update({ stock: newStock }).eq("id", sp.product_id);
      if (updateError) throw updateError;
    }

    res.json({ message: "✅ Service applied and stock deducted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error applying service", error: err.message });
  }
});

/* ================== START SERVER ================== */
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`✅ Services API running on port ${PORT}`);
});

// Services summary (total count)
app.get("/api/services/summary", async (req, res) => {
  try {
    const { count, error } = await supabase.from("services").select("*", { count: "exact", head: true });
    if (error) throw error;
    res.json({ totalServices: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
