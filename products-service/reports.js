// reports.js (backend)
export function registerReportsRoutes(app, supabase) {
  // Products report
  app.get("/api/reports/products", async (req, res) => {
    const { data, error } = await supabase
      .from("products")
      .select("*, categories(name), suppliers(name)")
      .order("created_at", { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  // Suppliers report
  app.get("/api/reports/suppliers", async (req, res) => {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });
}
