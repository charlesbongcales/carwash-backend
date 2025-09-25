import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { registerReportsRoutes } from "./reports.js";

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

// Add category
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

// ================== SUPPLIERS ==================

// Get all suppliers
app.get("/api/suppliers", async (req, res) => {
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Add supplier
app.post("/api/suppliers", async (req, res) => {
  const { name, contact_person, phone, email, address, notes } = req.body;

  const { data, error } = await supabase
    .from("suppliers")
    .insert([{ name, contact_person, phone, email, address, notes }])
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// Update supplier
app.put("/api/suppliers/:id", async (req, res) => {
  const { id } = req.params;
  const { name, contact_person, phone, email, address, notes } = req.body;

  const { data, error } = await supabase
    .from("suppliers")
    .update({
      name,
      contact_person,
      phone,
      email,
      address,
      notes,
      updated_at: new Date(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Delete supplier
app.delete("/api/suppliers/:id", async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase.from("suppliers").delete().eq("id", id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: "Supplier deleted successfully" });
});

// ================== PRODUCTS ==================

// Get all products (with category + supplier)
app.get("/api/products", async (req, res) => {
  const { data, error } = await supabase
    .from("products")
    .select("*, categories(name), suppliers(name)")
    .order("created_at", { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Add product
app.post("/api/products", async (req, res) => {
  const {
    name,
    description,
    category_id,
    supplier_id,
    cost,
    price,
    stock,
    reorder_level,
  } = req.body;
  const { data, error } = await supabase
    .from("products")
    .insert([
      {
        name,
        description,
        category_id,
        supplier_id,
        cost,
        price,
        stock,
        reorder_level,
      },
    ])
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// Update product
app.put("/api/products/:product_id", async (req, res) => {
  const { product_id } = req.params;
  const {
    name,
    description,
    category_id,
    supplier_id,
    cost,
    price,
    stock,
    reorder_level,
  } = req.body;
  const { data, error } = await supabase
    .from("products")
    .update({
      name,
      description,
      category_id,
      supplier_id,
      cost,
      price,
      stock,
      reorder_level,
      updated_at: new Date(),
    })
    .eq("product_id", product_id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Delete product
app.delete("/api/products/:product_id", async (req, res) => {
  const { product_id } = req.params;
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("product_id", product_id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: "Product deleted successfully" });
});

registerReportsRoutes(app, supabase);
// ================== START SERVER ==================
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});

app.get("/api/products/category/:category_id", async (req, res) => {
  const { category_id } = req.params;
  const { data, error } = await supabase
    .from("products")
    .select("*, categories(name), suppliers(name)")
    .eq("category_id", category_id)
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});
