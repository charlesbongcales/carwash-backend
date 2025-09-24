import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// ✅ Load .env file locally (Railway injects env automatically)
dotenv.config();

// --- Helper to clean env vars (Railway sometimes adds quotes) ---
function cleanEnv(value) {
  if (!value) return undefined;
  return value.replace(/^"(.+)"$/, "$1"); // strip leading + trailing quotes
}

// --- Environment variables ---
const SUPABASE_URL = cleanEnv(process.env.SUPABASE_URL);
const SUPABASE_SERVICE_ROLE_KEY = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
const SUPABASE_ANON_KEY = cleanEnv(process.env.SUPABASE_ANON_KEY);
const PORT = cleanEnv(process.env.PORT) || 3001;

// Debug log (don’t show full keys for security)
console.log("DEBUG ENV", {
  SUPABASE_URL,
  HAS_SERVICE_ROLE: !!SUPABASE_SERVICE_ROLE_KEY,
  HAS_ANON_KEY: !!SUPABASE_ANON_KEY,
  PORT,
});

// ✅ Fail fast if missing env vars
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
  console.error("❌ Missing Supabase environment variables!");
  process.exit(1);
}

// ✅ Supabase clients
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY); // for auth
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY); // for DB ops

// --- Express setup ---
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
    // 🔑 Authenticate with anon key
    const { data: authData, error: authError } =
      await supabaseAnon.auth.signInWithPassword({ email, password });

    if (authError) return res.status(400).json({ message: authError.message });

    const authUser = authData.user;

    // 🔑 Lookup user record
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, full_name, role_id, active")
      .eq("auth_uid", authUser.id)
      .single();

    if (userError) return res.status(400).json({ message: "User record not found" });
    if (!userData.active) return res.status(403).json({ message: "Account is inactive" });

    // 🔑 Lookup role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("roles")
      .select("name")
      .eq("id", userData.role_id)
      .single();

    if (roleError) return res.status(400).json({ message: "Role not found" });

    // ✅ Success
    return res.json({
      message: "Login successful",
      user: {
        id: userData.id,
        name: userData.full_name,
        role: roleData.name,
      },
      token: authData.session.access_token,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ================== SIGNUP ==================
app.post("/signup", async (req, res) => {
  const { email, password, full_name, role_id } = req.body;

  try {
    // 🔑 Create auth user with anon key
    const { data: authData, error: authError } =
      await supabaseAnon.auth.signUp({ email, password });

    if (authError) return res.status(400).json({ message: authError.message });

    const authUser = authData.user;

    // 🔑 Insert user row with service key
    const { error: insertError } = await supabaseAdmin.from("users").insert([
      {
        auth_uid: authUser.id,
        email,
        full_name,
        role_id,
        active: true,
      },
    ]);

    if (insertError) return res.status(400).json({ message: insertError.message });

    return res.json({
      message: "Signup successful",
      user: { email, full_name },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ================== START SERVER ==================
app.listen(PORT, () => {
  console.log(`✅ Users service running on port ${PORT}`);
});
