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
    
    // Create sales_items table
    await db.query(`CREATE TABLE IF NOT EXISTS sales_items (
      id SERIAL PRIMARY KEY, sale_id INTEGER, product_id INTEGER, product_name TEXT,
      quantity INTEGER NOT NULL, unit_price NUMERIC NOT NULL, total NUMERIC NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log("✓ sales_items table created");
    
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
    
    // Add missing columns to businesses table
    try {
      await db.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP`);
      await db.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP`);
      await db.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT`);
      console.log("✓ Subscription columns added to businesses");
    } catch (e) {
      console.log("Note: Some columns may already exist");
    }
    
    // Add retail and wholesale columns to inventory table
    try {
      await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS retail_quantity INTEGER DEFAULT 0`);
      await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS wholesale_quantity INTEGER DEFAULT 0`);
      await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS retail_cost_price NUMERIC DEFAULT 0`);
      await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS wholesale_cost_price NUMERIC DEFAULT 0`);
      await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS retail_price NUMERIC DEFAULT 0`);
      await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS wholesale_price NUMERIC DEFAULT 0`);
      
      // Copy existing data to retail columns for backward compatibility
      await db.query(`UPDATE inventory SET 
        retail_quantity = COALESCE(retail_quantity, 0),
        retail_cost_price = COALESCE(retail_cost_price, 0),
        retail_price = COALESCE(retail_price, 0)
        WHERE retail_quantity IS NULL OR retail_quantity = 0`);
        
      console.log("✓ Retail/Wholesale columns added to inventory");
    } catch (e) {
      console.log("Note: Inventory columns may already exist");
    }
    
    // Add sale_type to sales table
    try {
      await db.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS sale_type TEXT DEFAULT 'retail'`);
      await db.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS transaction_type TEXT DEFAULT 'cash'`);
      console.log("✓ Sale type columns added to sales");
    } catch (e) {
      console.log("Note: Sales columns may already exist");
    }
    
    // Create subscription_payments table
    await db.query(`CREATE TABLE IF NOT EXISTS subscription_payments (
      id SERIAL PRIMARY KEY,
      business_id INTEGER,
      payment_method TEXT,
      transaction_id TEXT,
      sender_number TEXT,
      amount NUMERIC,
      status TEXT DEFAULT 'pending',
      verification_notes TEXT,
      verified_by INTEGER,
      verified_at TIMESTAMP,
      subscription_activated BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log("✓ subscription_payments table created");
    
    // Create debt_payments table
    await db.query(`CREATE TABLE IF NOT EXISTS debt_payments (
      id SERIAL PRIMARY KEY,
      debt_id INTEGER,
      business_id INTEGER,
      amount NUMERIC,
      notes TEXT,
      payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log("✓ debt_payments table created");
    
    res.json({ message: "All tables created successfully!" });
  } catch (err) {
    console.error("Setup error:", err);
    res.status(500).json({ message: "Setup failed: " + err.message });
  }
});

module.exports = router;
