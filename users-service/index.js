import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

// Load env
dotenv.config();

// Helper to clean env vars
function cleanEnv(value) {
  if (!value) return undefined;
  return value.replace(/^"(.+)"$/, "$1");
}

// Supabase env
const SUPABASE_URL = cleanEnv(process.env.SUPABASE_URL);
const SUPABASE_SERVICE_ROLE_KEY = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
const SUPABASE_ANON_KEY = cleanEnv(process.env.SUPABASE_ANON_KEY);
const JWT_SECRET = cleanEnv(process.env.JWT_SECRET) || "supersecret"; // for signing tokens
const PORT = cleanEnv(process.env.PORT) || 3001;

// Supabase clients
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Express setup
const app = express();
app.use(cors());
app.use(express.json());

// ================== HEALTH CHECK ==================
app.get("/", (req, res) => {
  res.json({ message: "Users Service is running 🚀" });
});

// ================== LOGIN ==================
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data: authData, error: authError } =
      await supabaseAnon.auth.signInWithPassword({ email, password });
    if (authError) return res.status(400).json({ message: authError.message });

    const authUser = authData.user;

    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, full_name, role_id, active")
      .eq("auth_uid", authUser.id)
      .single();
    if (userError) return res.status(400).json({ message: "User record not found" });
    if (!userData.active) return res.status(403).json({ message: "Account is inactive" });

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("roles")
      .select("name")
      .eq("id", userData.role_id)
      .single();
    if (roleError) return res.status(400).json({ message: "Role not found" });

    // Sign JWT for admin API access
    const token = jwt.sign(
      { user_id: userData.id, role: roleData.name },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      message: "Login successful",
      user: {
        id: userData.id,
        name: userData.full_name,
        role: roleData.name,
      },
      token,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ================== SIGNUP ==================
app.post("/signup", async (req, res) => {
  const { email, password, full_name, role_id } = req.body;
  try {
    const { data: authData, error: authError } = await supabaseAnon.auth.signUp({ email, password });
    if (authError) return res.status(400).json({ message: authError.message });

    const authUser = authData.user;
    const { error: insertError } = await supabaseAdmin.from("users").insert([
      { auth_uid: authUser.id, email, full_name, role_id, active: true }
    ]);
    if (insertError) return res.status(400).json({ message: insertError.message });

    return res.json({ message: "Signup successful", user: { email, full_name } });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ================== Middleware to verify JWT and admin role ==================
const verifyAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No token provided" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded || decoded.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// ================== USER MANAGEMENT ==================

// GET all users
app.get("/users", verifyAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id, email, full_name, role_id, active");
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single user
app.get("/users/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id, email, full_name, role_id, active")
      .eq("id", id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create new user
app.post("/users", verifyAdmin, async (req, res) => {
  try {
    const { email, password, full_name, role_id } = req.body;

    const { data: authData, error: authError } = await supabaseAnon.auth.signUp({ email, password });
    if (authError) return res.status(400).json({ message: authError.message });

    const authUser = authData.user;
    const { error: insertError } = await supabaseAdmin.from("users").insert([
      { auth_uid: authUser.id, email, full_name, role_id, active: true }
    ]);
    if (insertError) throw insertError;

    res.json({ message: "User created successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update user
app.put("/users/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, role_id, active } = req.body;

    const { error } = await supabaseAdmin
      .from("users")
      .update({ full_name, role_id, active })
      .eq("id", id);
    if (error) throw error;

    res.json({ message: "User updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE user
app.delete("/users/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin.from("users").delete().eq("id", id);
    if (error) throw error;

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================== START SERVER ==================
app.listen(PORT, () => {
  console.log(`✅ Users service running on port ${PORT}`);
});
