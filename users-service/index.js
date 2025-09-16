import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config(); // loads .env into process.env

const app = express();
app.use(cors());
app.use(express.json());

// Init Supabase client only if env vars are present
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "Users Service" });
});

// Sample users route: uses Supabase if available, else returns a sample
app.get("/users", async (req, res) => {
  if (!supabase) {
    return res.json([{ id: 0, name: "Sample Admin (no DB configured)" }]);
  }

  try {
    const { data, error } = await supabase.from("users").select("*").limit(10);
    if (error) {
      // If table not exist or other issues, return fallback
      return res.json([{ id: 0, name: "Sample Admin (supabase error)" }]);
    }
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Users Service running on port ${PORT}`);
});
