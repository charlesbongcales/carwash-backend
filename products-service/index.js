import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "Products Service" });
});

// Sample products route
app.get("/products", (req, res) => {
  res.json([
    { id: 1, name: "Shampoo", stock: 50 },
    { id: 2, name: "Tire Cleaner", stock: 20 }
  ]);
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Products Service running on port ${PORT}`);
});
