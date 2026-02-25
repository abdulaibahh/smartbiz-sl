const router = require("express").Router();
const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const auth = require("../middlewares/auth");
const roleAuth = require("../middlewares/role");

/* ================= REGISTER BUSINESS OWNER ================= */

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, business_name } = req.body;

    if (!name || !email || !password || !business_name) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await db.query(
      "SELECT id FROM users WHERE email=$1",
      [email]
    );

    if (existingUser.rows.length) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const business = await db.query(
      "INSERT INTO businesses(name, subscription_active, trial_end) VALUES($1, false, NOW() + interval '30 days') RETURNING id",
      [business_name]
    );

    const business_id = business.rows[0].id;

    await db.query(
      "INSERT INTO users(name, email, password, role, business_id) VALUES($1, $2, $3, 'owner', $4)",
      [name, email, hashed, business_id]
    );

    res.json({ message: "Business created successfully" });

  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Registration failed" });
  }
});

/* ================= LOGIN ================= */

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await db.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (!user.rows.length) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.rows[0].password);

    if (!valid) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      {
        id: user.rows[0].id,
        role: user.rows[0].role,
        business_id: user.rows[0].business_id
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });

  } catch (err) {
    console.error("Login error:", err);
    if (err.message && err.message.includes("relation")) {
      return res.status(500).json({ message: "Database tables not set up" });
    }
    res.status(500).json({ message: "Login failed: " + err.message });
  }
});

/* ================= CREATE TEST USER ================= */
router.post("/create-demo", async (req, res) => {
  try {
    const existing = await db.query("SELECT id FROM users WHERE email=$1", ["smartbiz@shop.com"]);
    if (existing.rows.length) {
      return res.json({ message: "Demo user exists" });
    }
    
    const business = await db.query(
      "INSERT INTO businesses(name, subscription_active, trial_end) VALUES($1, true, NOW() + interval '30 days') RETURNING id",
      ["Demo Business"]
    );
    
    const hashed = await bcrypt.hash("password123", 10);
    await db.query(
      "INSERT INTO users(name, email, password, role, business_id) VALUES($1, $2, $3, $4, $5)",
      ["Demo User", "smartbiz@shop.com", hashed, "owner", business.rows[0].id]
    );
    
    res.json({ message: "Demo user created" });
  } catch (err) {
    console.error("Create demo error:", err);
    res.status(500).json({ message: "Failed to create demo" });
  }
});

/* ================= GET BUSINESS USERS ================= */

router.get("/users", auth, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, name, email, role, business_id, created_at FROM users WHERE business_id=$1 ORDER BY created_at DESC",
      [req.user.business_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

/* ================= CREATE USER (Owner only) ================= */

router.post("/users", auth, roleAuth("owner"), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const allowedRoles = ["cashier", "manager"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const existing = await db.query(
      "SELECT id FROM users WHERE email=$1",
      [email]
    );

    if (existing.rows.length) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const hashed = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO users(name, email, password, role, business_id) VALUES($1, $2, $3, $4, $5)",
      [name, email, hashed, role, req.user.business_id]
    );

    res.json({ message: "User created successfully" });
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ message: "Failed to create user" });
  }
});

/* ================= DELETE USER ================= */

router.delete("/users/:id", auth, roleAuth("owner"), async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }

    const user = await db.query(
      "SELECT id FROM users WHERE id=$1 AND business_id=$2",
      [id, req.user.business_id]
    );

    if (!user.rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    await db.query("DELETE FROM users WHERE id=$1", [id]);

    res.json({ message: "User deleted" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

/* ================= DELETE ACCOUNT (Owner Only) ================= */

router.delete("/account", auth, roleAuth("owner"), async (req, res) => {
  const client = await db.connect();
  
  try {
    await client.query("BEGIN");
    
    const businessId = req.user.business_id;
    
    // Delete all related data in correct order (respecting foreign key constraints)
    
    // 1. Delete debt payments first (depends on debts)
    await client.query(
      "DELETE FROM debt_payments WHERE debt_id IN (SELECT id FROM debts WHERE business_id=$1)",
      [businessId]
    );
    
    // 2. Delete debts
    await client.query("DELETE FROM debts WHERE business_id=$1", [businessId]);
    
    // 3. Delete sales items first (depends on sales)
    await client.query(
      "DELETE FROM sales_items WHERE sale_id IN (SELECT id FROM sales WHERE business_id=$1)",
      [businessId]
    );
    
    // 4. Delete sales
    await client.query("DELETE FROM sales WHERE business_id=$1", [businessId]);
    
    // 5. Delete order items first (depends on orders)
    await client.query(
      "DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE business_id=$1)",
      [businessId]
    );
    
    // 6. Delete supplier payments first (depends on orders)
    await client.query("DELETE FROM supplier_payments WHERE business_id=$1", [businessId]);
    
    // 7. Delete orders
    await client.query("DELETE FROM orders WHERE business_id=$1", [businessId]);
    
    // 8. Delete inventory
    await client.query("DELETE FROM inventory WHERE business_id=$1", [businessId]);
    
    // 9. Delete customers
    await client.query("DELETE FROM customers WHERE business_id=$1", [businessId]);
    
    // 10. Delete subscription payments
    await client.query("DELETE FROM subscription_payments WHERE business_id=$1", [businessId]);
    
    // 11. Delete subscriptions
    await client.query("DELETE FROM subscriptions WHERE business_id=$1", [businessId]);
    
    // 12. Delete password reset tokens for all users of this business
    await client.query(
      "DELETE FROM password_reset_tokens WHERE user_id IN (SELECT id FROM users WHERE business_id=$1)",
      [businessId]
    );
    
    // 13. Delete stripe events for this business
    // Note: stripe_events table doesn't have business_id, so we skip this or delete all
    // await client.query("DELETE FROM stripe_events");
    
    // 14. Delete all users of the business (including owner)
    await client.query("DELETE FROM users WHERE business_id=$1", [businessId]);
    
    // 15. Delete the business
    await client.query("DELETE FROM businesses WHERE id=$1", [businessId]);
    
    await client.query("COMMIT");
    
    // Return success - client will handle logout
    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Delete account error:", err);
    res.status(500).json({ message: "Failed to delete account: " + err.message });
  } finally {
    client.release();
  }
});

/* ================= PASSWORD RESET ================= */

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await db.query(
      "SELECT id, name FROM users WHERE email=$1",
      [email]
    );

    if (!user.rows.length) {
      return res.json({ message: "If the email exists, a reset link will be sent" });
    }

    const crypto = require("crypto");
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.query(
      "INSERT INTO password_reset_tokens(user_id, token, expires_at) VALUES($1, $2, $3)",
      [user.rows[0].id, resetToken, expiresAt]
    );

    const resetLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;
    
    console.log("Password reset link:", resetLink);
    
    res.json({ 
      message: "If the email exists, a reset link will be sent",
      demoLink: resetLink
    });

  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Failed to process request" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: "Token and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const tokenResult = await db.query(
      "SELECT * FROM password_reset_tokens WHERE token=$1 AND used=false AND expires_at > NOW()",
      [token]
    );

    if (!tokenResult.rows.length) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const resetRecord = tokenResult.rows[0];

    const hashed = await bcrypt.hash(password, 10);

    await db.query(
      "UPDATE users SET password=$1, updated_at=NOW() WHERE id=$2",
      [hashed, resetRecord.user_id]
    );

    await db.query(
      "UPDATE password_reset_tokens SET used=true WHERE id=$1",
      [resetRecord.id]
    );

    res.json({ message: "Password reset successful" });

  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Failed to reset password" });
  }
});

module.exports = router;
