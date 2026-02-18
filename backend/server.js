require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 5000;

/* SECURITY */
app.use(helmet());
app.use(cors());

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

/* Stripe webhook BEFORE json */
app.use("/api/subscription", require("./src/routes/subscription.routes"));

/* JSON parser */
app.use(express.json());

/* ROUTES */
app.get("/", (req, res) => res.send("🚀 SmartBiz API running"));

app.use("/api/auth", require("./src/routes/auth.routes"));
app.use("/api/business", require("./src/routes/business.routes"));
app.use("/api/sales", require("./src/routes/sales.routes"));
app.use("/api/inventory", require("./src/routes/inventory.routes"));
app.use("/api/debt", require("./src/routes/debt.routes"));
app.use("/api/ai", require("./src/routes/ai.routes"));
app.use("/api/platform", require("./src/routes/platform.routes"));

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
