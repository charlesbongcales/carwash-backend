import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { registerReportsRoutes } from "./reports.js";
import jwt from "jsonwebtoken";

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


const verifyUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No token provided" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecret");

    // Allow both user and employee roles
    if (!decoded || (decoded.role !== "user" && decoded.role !== "employee")) {
      return res.status(403).json({ message: "Access denied. Users only." });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

const verifyAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No token provided" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecret");

    if (!decoded || decoded.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};


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
    .eq("archived", false) // <-- exclude archived products
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

// Archive product (soft delete)
app.patch("/api/products/:product_id/archive", verifyAdmin, async (req, res) => {
  const { product_id } = req.params;

  try {
    // Check if product exists
    const { data: product, error: fetchError } = await supabase
      .from("products")
      .select("*")
      .eq("product_id", product_id)
      .single();
    if (fetchError || !product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Update archived flag
    const { data, error: updateError } = await supabase
      .from("products")
      .update({ archived: true })
      .eq("product_id", product_id)
      .select()
      .single();
    if (updateError) throw updateError;

    res.json({ message: "Product archived successfully", product: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// ================== LOW STOCK AUTO DETECTION ==================

// GET /api/products/low-stock - Admin views low stock products
app.get("/api/products/low-stock", verifyAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select(`
        product_id,
        name,
        stock,
        reorder_level,
        suppliers(name),
        categories(name)
      `)
      .lte("stock", supabase.raw("reorder_level"))
      .order("stock", { ascending: true });

    if (error) throw error;

    res.json({
      message: "Low stock products retrieved",
      count: data.length,
      products: data
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================== AUTO PURCHASE SUGGESTION ==================

// GET /api/products/low-stock/suggestions
app.get("/api/products/low-stock/suggestions", verifyAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select(`
        product_id,
        name,
        stock,
        reorder_level,
        supplier_id,
        suppliers(name)
      `)
      .lte("stock", supabase.raw("reorder_level"));

    if (error) throw error;

    const suggestions = data.map(p => ({
      product_id: p.product_id,
      product_name: p.name,
      supplier_id: p.supplier_id,
      supplier_name: p.suppliers?.name || null,
      current_stock: p.stock,
      reorder_level: p.reorder_level,
      suggested_order_qty: Math.max(p.reorder_level - p.stock, 0)
    }));

    res.json({
      message: "Purchase suggestions generated",
      count: suggestions.length,
      suggestions
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

 // make sure this is imported at the top

// ================== ROLE MIDDLEWARE ==================

// Middleware to verify user role



// ================== REQUISITIONS ENDPOINTS ==================

// POST /api/requisitions - User creates a requisition
app.post("/api/requisitions", verifyUser, async (req, res) => {
  try {
    const { reason, items } = req.body; // items = [{ product_id, quantity }]
    const requested_by = req.user.user_id;

    // 1️⃣ Create requisition
    const { data: requisition, error: reqError } = await supabase
      .from("purchase_requisitions")
      .insert([{ requested_by, reason }])
      .select()
      .single();
    if (reqError) throw reqError;

    // 2️⃣ Add items
    const requisitionItems = items.map(i => ({
      requisition_id: requisition.id,
      product_id: i.product_id,
      quantity: i.quantity
    }));

    const { data: itemsData, error: itemsError } = await supabase
      .from("purchase_requisition_items")
      .insert(requisitionItems)
      .select();
    if (itemsError) throw itemsError;

    res.json({ message: "Requisition created", requisition, items: itemsData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Middleware to verify admin role




// GET /api/requisitions - Admin views all requisitions
app.get("/api/requisitions", verifyAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("purchase_requisitions")
      .select(`
        *,
        requested_by_users:users(id, full_name),
        items:purchase_requisition_items(*, product:products(name))
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================== APPROVE / REJECT REQUISITION ==================

// PATCH /api/requisitions/:id - Admin approves/rejects requisition
app.patch("/api/requisitions/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "Invalid action. Use 'approve' or 'reject'." });
    }

    // Fetch requisition
    const { data: requisition, error: reqError } = await supabase
      .from("purchase_requisitions")
      .select("*")
      .eq("id", id)
      .single();
    if (reqError || !requisition) return res.status(404).json({ message: "Requisition not found" });

    if (requisition.status !== "pending") {
      return res.status(400).json({ message: "Requisition already processed." });
    }

    // Update requisition status only
    const { data: updatedReq, error: updateReqError } = await supabase
      .from("purchase_requisitions")
      .update({ status: action === "approve" ? "approved" : "rejected" })
      .eq("id", id)
      .select()
      .single();
    if (updateReqError) throw updateReqError;

    res.json({ 
      message: action === "approve" ? "Requisition approved" : "Requisition rejected",
      requisition: updatedReq 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/purchases/from-requisition
// POST /api/purchases/from-requisition
app.post("/api/purchases/from-requisition", verifyAdmin, async (req, res) => {
  try {
    const { requisition_id, supplier_id, items, notes } = req.body;
    const created_by = req.user.user_id;

    // Check that requisition exists and is approved
    const { data: requisition, error: reqError } = await supabase
      .from("purchase_requisitions")
      .select("*")
      .eq("id", requisition_id)
      .single();
    if (reqError || !requisition) return res.status(404).json({ message: "Requisition not found" });
    if (requisition.status !== "approved") return res.status(400).json({ message: "Requisition not approved yet" });

    // 1️⃣ Create Purchase Order
    const { data: purchase, error: purchaseError } = await supabase
      .from("purchases")
      .insert([{ supplier_id, notes: notes || `PO from requisition #${requisition_id}`, created_by, status: "pending" }])
      .select()
      .single();
    if (purchaseError) throw purchaseError;

    // 2️⃣ Add purchase items
    const purchaseItems = items.map(i => ({
      purchase_id: purchase.id,
      product_id: i.product_id,
      quantity: i.quantity,
      cost: i.cost || 0
    }));
    const { data: itemsData, error: itemsError } = await supabase
      .from("purchase_items")
      .insert(purchaseItems)
      .select();
    if (itemsError) throw itemsError;

    // 3️⃣ Mark requisition as fulfilled
    await supabase
      .from("purchase_requisitions")
      .update({ status: "fulfilled" })  // <-- NEW LINE
      .eq("id", requisition_id);

    res.json({ message: "Purchase order created from requisition", purchase, items: itemsData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




// ================== PURCHASES ENDPOINTS ==================


// POST /api/purchases - Create a new purchase order
app.post("/api/purchases", verifyAdmin, async (req, res) => {
  try {
    const { supplier_id, items, notes } = req.body; // items = [{ product_id, quantity, cost }]
    const created_by = req.user.user_id;

    // 1️⃣ Create purchase order
    const { data: purchase, error: purchaseError } = await supabase
      .from("purchases")
      .insert([{ supplier_id, notes, created_by, status: "pending" }])
      .select()
      .single();
    if (purchaseError) throw purchaseError;

    // 2️⃣ Add purchase items
    const purchaseItems = items.map(i => ({
      purchase_id: purchase.id,
      product_id: i.product_id,
      quantity: i.quantity,
      cost: i.cost
    }));

    const { data: itemsData, error: itemsError } = await supabase
      .from("purchase_items")
      .insert(purchaseItems)
      .select();
    if (itemsError) throw itemsError;

    res.json({ message: "Purchase order created", purchase, items: itemsData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/purchases/:id/receive - Mark purchase as received and update stock
// PATCH /api/purchases/:id/receive
app.patch("/api/purchases/:id/receive", async (req, res) => {
  try {
    const purchaseId = Number(req.params.id);
    const { items, received_by } = req.body; // frontend sends items + user id

    if (!items?.length) {
      return res.status(400).json({ message: "No items provided" });
    }

    // 1️⃣ Update purchase status
    const { data: purchase, error: purchaseError } = await supabase
      .from("purchases")
      .update({ status: "received" })
      .eq("id", purchaseId)
      .select()
      .single();

    if (purchaseError) throw purchaseError;

    // 2️⃣ Loop through items and log inventory + update stock
    for (const item of items) {
      const { product_id, quantity, cost } = item;

      // a) Get current product stock
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("stock, cost")
        .eq("product_id", product_id)
        .single();

      if (productError) throw productError;

      const previousStock = product.stock;
      const newStock = previousStock + quantity;
      const unitCost = cost ?? product.cost ?? 0;
      const totalCostImpact = quantity * unitCost;

      // b) Insert inventory log
      await supabase.from("inventory_logs").insert([
        {
          product_id,
          change: quantity,
          reason: "PURCHASE_RECEIVED",
          ref_table: "purchases",
          ref_id: purchaseId,
          created_by: received_by,
          metadata: {
            previous_stock: previousStock,
            new_stock: newStock,
            unit_cost: unitCost,
            total_cost_impact: totalCostImpact
          }
        }
      ]);

      // c) Update product stock
      await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("product_id", product_id);
    }

    res.json({ status: "success", message: "Purchase received successfully" });
  } catch (err) {
    console.error("Receive purchase error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});


// GET /api/purchases - List all purchases with supplier and items
app.get("/api/requisitions/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("purchase_requisitions")
      .select(`
        *,
        items:purchase_requisition_items(
          id,
          product_id,
          quantity,
          product:products(
            product_id, 
            name, 
            cost, 
            stock, 
            supplier_id,
            supplier:suppliers(name)
          )
        )
      `)
      .eq("id", id)
      .single();

    if (error || !data) {
      return res.status(404).json({ message: "Requisition not found" });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// GET /api/purchases - List all purchases with supplier and items
app.get("/api/purchases", verifyAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("purchases")
      .select(`
        *,
        supplier:suppliers(id, name),
        items:purchase_items(
          id,
          product_id,
          quantity,
          cost,
          product:products(name)
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});