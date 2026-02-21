const router = require("express").Router();
const db = require("../config/db");

// Health check with database test
router.get("/health", async (req, res) => {
  try {
    console.log("Testing database connection...");
    console.log("DATABASE_URL:", process.env.DATABASE_URL ? "set" : "NOT SET");
    
    // Test database connection
    const result = await db.query("SELECT NOW()");
    
    // Check if tables exist
    const tables = await db.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const tableNames = tables.rows.map(t => t.table_name);
    
    res.json({
      status: "ok",
      time: result.rows[0].now,
      tables: tableNames
    });
  } catch (err) {
    console.error("Database health check error:", err);
    res.status(500).json({
      status: "error",
      message: err.message,
      code: err.code,
      hint: "Check if DATABASE_URL environment variable is set correctly"
    });
  }
});

// Setup database tables
router.post("/setup", async (req, res) => {
  try {
    console.log("Setting up database tables...");
    
    // Create businesses table
    await db.query(`CREATE TABLE IF NOT EXISTS businesses (
      id SERIAL PRIMARY KEY, name TEXT, shop_name TEXT, address TEXT, phone TEXT,
      logo_url TEXT, trial_end TIMESTAMP, subscription_active BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log("✓ businesses table created");
    
    // Create users table
    await db.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY, name TEXT, email TEXT UNIQUE, password TEXT,
      role TEXT DEFAULT 'cashier', business_id INTEGER,
      password_reset_token TEXT, password_reset_expires TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log("✓ users table created");
    
    // Create password_reset_tokens table
    await db.query(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY, user_id INTEGER, token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL, used BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log("✓ password_reset_tokens table created");
    
    // Create inventory table
    await db.query(`CREATE TABLE IF NOT EXISTS inventory (
      id SERIAL PRIMARY KEY, business_id INTEGER, product TEXT, quantity INTEGER,
      cost_price NUMERIC DEFAULT 0, selling_price NUMERIC DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log("✓ inventory table created");
    
    // Create sales table
    await db.query(`CREATE TABLE IF NOT EXISTS sales (
      id SERIAL PRIMARY KEY, business_id INTEGER, customer_id INTEGER, user_id INTEGER,
      total NUMERIC NOT NULL, paid NUMERIC DEFAULT 0, customer TEXT,
      sale_type TEXT DEFAULT 'cash', status TEXT DEFAULT 'completed', notes TEXT,
      receipt_sent BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log("✓ sales table created");
    
    // Create customers table
    await db.query(`CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY, business_id INTEGER, name TEXT NOT NULL, email TEXT,
      phone TEXT, address TEXT, notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log("✓ customers table created");
    
    // Create debts table
    await db.query(`CREATE TABLE IF NOT EXISTS debts (
      id SERIAL PRIMARY KEY, business_id INTEGER, customer TEXT, amount NUMERIC,
      customer_id INTEGER, sale_id INTEGER, payment_amount NUMERIC DEFAULT 0,
      status TEXT DEFAULT 'pending', due_date DATE, description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log("✓ debts table created");
    
    // Create subscriptions table
    await db.query(`CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY, business_id INTEGER, active BOOLEAN DEFAULT true, end_date TIMESTAMP
    )`);
    console.log("✓ subscriptions table created");
    
    // Create orders table
    await db.query(`CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY, business_id INTEGER, supplier TEXT, total NUMERIC,
      status TEXT DEFAULT 'pending', items JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log("✓ orders table created");
    
    res.json({ message: "All tables created successfully!" });
  } catch (err) {
    console.error("Setup error:", err);
    res.status(500).json({ message: "Setup failed: " + err.message });
  }
});

module.exports = router;
