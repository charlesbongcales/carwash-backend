import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Supabase client (backend)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --------- ROUTES ---------

// Health check
app.get("/", (req, res) => {
  res.send("Users Service is running 🚀");
});

// Login endpoint
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Authenticate with Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    const authUser = authData.user;

    // 2. Get role from custom users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, full_name, role_id, active")
      .eq("auth_uid", authUser.id)
      .single();

    if (userError) {
      return res.status(400).json({ error: "User record not found" });
    }

    if (!userData.active) {
      return res.status(403).json({ error: "Account is inactive" });
    }

    // 3. Get role name
    const { data: roleData, error: roleError } = await supabase
      .from("roles")
      .select("name")
      .eq("id", userData.role_id)
      .single();

    if (roleError) {
      return res.status(400).json({ error: "Role not found" });
    }

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

// Signup endpoint (optional for now)
app.post("/signup", async (req, res) => {
  const { email, password, full_name, role_id } = req.body;

  try {
    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.signUp({
        email,
        password,
      });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    const authUser = authData.user;

    // 2. Insert into custom users table
    const { error: insertError } = await supabase.from("users").insert([
      {
        auth_uid: authUser.id,
        email,
        full_name,
        role_id,
      },
    ]);

    if (insertError) {
      return res.status(400).json({ error: insertError.message });
    }

    return res.json({ message: "Signup successful", user: { email, full_name } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --------- START SERVER ---------
app.listen(process.env.PORT, () => {
  console.log(`Users service running on port ${process.env.PORT}`);
});
