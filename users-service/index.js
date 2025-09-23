import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

// --- Helper to clean env vars (Railway wraps them in quotes) ---
function cleanEnv(value) {
  if (!value) return undefined;
  return value.replace(/^"(.+)"$/, "$1"); // strip leading + trailing quotes
}

// --- Cleaned environment variables ---
const SUPABASE_URL = cleanEnv(process.env.SUPABASE_URL);
const SUPABASE_SERVICE_ROLE_KEY = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
const SUPABASE_ANON_KEY = cleanEnv(process.env.SUPABASE_ANON_KEY);
const PORT = cleanEnv(process.env.PORT) || 3001;

// Debug log
console.log("DEBUG ENV", {
  SUPABASE_URL,
  HAS_SERVICE_ROLE: !!SUPABASE_SERVICE_ROLE_KEY,
  HAS_ANON_KEY: !!SUPABASE_ANON_KEY,
  PORT,
});

// Fail fast if missing env vars
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase environment variables!");
  process.exit(1);
}

// Supabase client (backend)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// --- Express setup ---
const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.send("Users Service is running 🚀");
});

// Login endpoint
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (authError) return res.status(400).json({ error: authError.message });

    const authUser = authData.user;

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, full_name, role_id, active")
      .eq("auth_uid", authUser.id)
      .single();

    if (userError) return res.status(400).json({ error: "User record not found" });
    if (!userData.active) return res.status(403).json({ error: "Account is inactive" });

    const { data: roleData, error: roleError } = await supabase
      .from("roles")
      .select("name")
      .eq("id", userData.role_id)
      .single();

    if (roleError) return res.status(400).json({ error: "Role not found" });

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
    return res.status(500).json({ error: err.message });
  }
});

// Signup endpoint
app.post("/signup", async (req, res) => {
  const { email, password, full_name, role_id } = req.body;

  try {
    const { data: authData, error: authError } =
      await supabase.auth.signUp({ email, password });

    if (authError) return res.status(400).json({ error: authError.message });

    const authUser = authData.user;

    const { error: insertError } = await supabase.from("users").insert([
      {
        auth_uid: authUser.id,
        email,
        full_name,
        role_id,
      },
    ]);

    if (insertError) return res.status(400).json({ error: insertError.message });

    return res.json({ message: "Signup successful", user: { email, full_name } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`✅ Users service running on port ${PORT}`);
});
