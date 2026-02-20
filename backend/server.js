require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

/* SECURITY */
app.use(helmet());
app.use(cors({
  origin: "*",
  credentials: true
}));

/* Static files for uploads */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

/* Stripe webhook BEFORE json - mount only webhook route */
const subscriptionRoutes = require("./src/routes/subscription.routes");
app.use("/api/subscription/webhook", subscriptionRoutes);

/* JSON parser */
app.use(express.json());

/* Mount rest of subscription routes after JSON parser */
app.use("/api/subscription", subscriptionRoutes);

/* ROUTES */
app.get("/", (req, res) => res.send("🚀 SmartBiz API running"));

app.use("/api/auth", require("./src/routes/auth.routes"));
app.use("/api/business", require("./src/routes/business.routes"));
app.use("/api/sales", require("./src/routes/sales.routes"));
app.use("/api/inventory", require("./src/routes/inventory.routes"));
app.use("/api/debt", require("./src/routes/debt.routes"));
app.use("/api/ai", require("./src/routes/ai.routes"));
app.use("/api/platform", require("./src/routes/platform.routes"));
app.use("/api/customers", require("./src/routes/customer.routes"));
app.use("/api/orders", require("./src/routes/orders.routes"));

/* ERROR HANDLER */
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

/* START */
app.listen(PORT, () =>
  console.log(`✅ Server running on ${PORT}`)
);

require("./src/jobs/dailyReport");
