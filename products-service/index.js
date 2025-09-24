import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load env vars
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8001;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ================== HEALTH CHECK ==================
app.get("/", (req, res) => {
  res.json({ message: "Carwash Inventory Backend is running 🚀" });
});

// ================== CATEGORIES ==================

// Get all categories
app.get("/api/categories", async (req, res) => {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Add new category
app.post("/api/categories", async (req, res) => {
  const { name, description } = req.body;
  const { data, error } = await supabase
    .from("categories")
    .insert([{ name, description }])
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// Update category
app.put("/api/categories/:id", async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const { data, error } = await supabase
    .from("categories")
    .update({ name, description })
    .eq("id", id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Delete category
app.delete("/api/categories/:id", async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: "Category deleted successfully" });
});

// ================== PRODUCTS ==================

// Get all products (with category info)
app.get("/api/products", async (req, res) => {
  const { data, error } = await supabase
    .from("products")
    .select("*, categories(name)")
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Add new product
app.post("/api/products", async (req, res) => {
  const { sku, name, description, category_id, supplier_id, unit, cost, price, stock, reorder_level, image_path } = req.body;

  const { data, error } = await supabase
    .from("products")
    .insert([{ sku, name, description, category_id, supplier_id, unit, cost, price, stock, reorder_level, image_path }])
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// Update product
app.put("/api/products/:product_id", async (req, res) => {
  const { product_id } = req.params;
  const { sku, name, description, category_id, supplier_id, unit, cost, price, stock, reorder_level, image_path } = req.body;

  const { data, error } = await supabase
    .from("products")
    .update({ sku, name, description, category_id, supplier_id, unit, cost, price, stock, reorder_level, image_path, updated_at: new Date() })
    .eq("product_id", product_id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Delete product
app.delete("/api/products/:product_id", async (req, res) => {
  const { product_id } = req.params;
  const { error } = await supabase.from("products").delete().eq("product_id", product_id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: "Product deleted successfully" });
});

// ================== START SERVER ==================
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
