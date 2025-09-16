import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "Carwash Services Service" });
});

// Sample carwash services
app.get("/services", (req, res) => {
  res.json([
    { id: 1, name: "Premium Wash", price: 500 },
    { id: 2, name: "Basic Wash", price: 250 },
    { id: 3, name: "Interior Detailing", price: 800 }
  ]);
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`Services Service running on port ${PORT}`);
});
