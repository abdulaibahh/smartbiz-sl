require("dotenv").config();
const db = require("./src/config/db");

async function setupDatabase() {
  console.log("Setting up database tables...");
  
  try {
    // Create businesses table
    await db.query(`
      CREATE TABLE IF NOT EXISTS businesses (
        id SERIAL PRIMARY KEY,
        name TEXT,
        shop_name TEXT,
        address TEXT,
        phone TEXT,
        logo_url TEXT,
        trial_end TIMESTAMP,
        subscription_active BOOLEAN DEFAULT false,
        subscription_start_date TIMESTAMP,
        subscription_end_date TIMESTAMP,
        stripe_customer_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✓ Businesses table ready");
    
    // Add subscription columns if they don't exist (for existing tables)
    try {
      await db.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP`);
      await db.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP`);
      await db.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT`);
      console.log("✓ Subscription columns verified");
    } catch (e) {
      // Columns may already exist, ignore error
    }

    
    // Create users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'cashier',
        business_id INTEGER,
        password_reset_token TEXT,
        password_reset_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✓ Users table ready");
    
    // Create password_reset_tokens table
    await db.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✓ Password reset tokens table ready");
    
    // Create customers table
    await db.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        business_id INTEGER,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✓ Customers table ready");
    
    // Create inventory table
    await db.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        business_id INTEGER,
        product TEXT,
        quantity INTEGER,
        cost_price NUMERIC DEFAULT 0,
        selling_price NUMERIC DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✓ Inventory table ready");
    
    // Create sales table
    await db.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        business_id INTEGER,
        customer_id INTEGER,
        user_id INTEGER,
        total NUMERIC NOT NULL,
        paid NUMERIC DEFAULT 0,
        customer TEXT,
        sale_type TEXT DEFAULT 'cash',
        status TEXT DEFAULT 'completed',
        notes TEXT,
        receipt_sent BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✓ Sales table ready");
    
    // Create sales_items table
    await db.query(`
      CREATE TABLE IF NOT EXISTS sales_items (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER,
        product_id INTEGER,
        product_name TEXT,
        quantity INTEGER,
        unit_price NUMERIC,
        total NUMERIC,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✓ Sales items table ready");
    
    // Create debts table
    await db.query(`
      CREATE TABLE IF NOT EXISTS debts (
        id SERIAL PRIMARY KEY,
        business_id INTEGER,
        customer TEXT,
        amount NUMERIC,
        customer_id INTEGER,
        sale_id INTEGER,
        payment_amount NUMERIC DEFAULT 0,
        status TEXT DEFAULT 'pending',
        due_date DATE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✓ Debts table ready");
    
    // Add missing columns if they don't exist
    try {
      await db.query(`ALTER TABLE debts ADD COLUMN IF NOT EXISTS payment_amount NUMERIC DEFAULT 0`);
      await db.query(`ALTER TABLE debts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'`);
      await db.query(`ALTER TABLE debts ADD COLUMN IF NOT EXISTS description TEXT`);
      await db.query(`ALTER TABLE debts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    console.log("✓ Debts columns verified");
    } catch (e) {
      // Columns may already exist, ignore error
    }

    // Create debt_payments table
    await db.query(`
      CREATE TABLE IF NOT EXISTS debt_payments (
        id SERIAL PRIMARY KEY,
        debt_id INTEGER NOT NULL,
        business_id INTEGER,
        amount NUMERIC NOT NULL,
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✓ Debt payments table ready");

    
    // Create subscriptions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        business_id INTEGER,
        active BOOLEAN DEFAULT true,
        end_date TIMESTAMP
      )
    `);
    console.log("✓ Subscriptions table ready");
    
    // Create subscription_payments table
    await db.query(`
      CREATE TABLE IF NOT EXISTS subscription_payments (
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
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("✓ Subscription payments table ready");
    
    // Add verification columns if they don't exist
    try {
      await db.query(`ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS verification_notes TEXT`);
      await db.query(`ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS verified_by INTEGER`);
      await db.query(`ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP`);
      await db.query(`ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS subscription_activated BOOLEAN DEFAULT false`);
      console.log("✓ Payment verification columns verified");
    } catch (e) {
      // Columns may already exist, ignore error
    }

    
    // Create stripe_events table
    await db.query(`
      CREATE TABLE IF NOT EXISTS stripe_events (
        id SERIAL PRIMARY KEY,
        event_id TEXT UNIQUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("✓ Stripe events table ready");
    
    // Create platform_admins table
    await db.query(`
      CREATE TABLE IF NOT EXISTS platform_admins (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE,
        password TEXT
      )
    `);
    console.log("✓ Platform admins table ready");
    
    // Create orders table
    await db.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        business_id INTEGER,
        supplier_name TEXT NOT NULL,
        supplier_contact TEXT,
        order_date DATE DEFAULT CURRENT_DATE,
        expected_delivery_date DATE,
        status TEXT DEFAULT 'pending',
        total_amount NUMERIC DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✓ Orders table ready");
    
    // Create order_items table
    await db.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER,
        product_id INTEGER,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price NUMERIC DEFAULT 0,
        total_price NUMERIC DEFAULT 0,
        received_quantity INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✓ Order items table ready");
    
    // Create supplier_payments table
    await db.query(`
      CREATE TABLE IF NOT EXISTS supplier_payments (
        id SERIAL PRIMARY KEY,
        business_id INTEGER,
        order_id INTEGER,
        amount NUMERIC NOT NULL,
        payment_method TEXT,
        reference_number TEXT,
        payment_date DATE DEFAULT CURRENT_DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✓ Supplier payments table ready");
    
    // Insert default business if none exists
    const businessCheck = await db.query("SELECT COUNT(*) FROM businesses");
    if (parseInt(businessCheck.rows[0].count) === 0) {
      await db.query(`
        INSERT INTO businesses (id, name, shop_name, address, phone)
        VALUES (1, 'My Business', 'My Shop', '123 Main Street, Freetown', '+232 76 123456')
      `);
      console.log("✓ Default business created (ID: 1)");
    }
    
    // Insert default admin user if none exists
    const userCheck = await db.query("SELECT COUNT(*) FROM users");
    if (parseInt(userCheck.rows[0].count) === 0) {
      // Password: admin123 (bcryptjs hash)
      const bcrypt = require("bcryptjs");
      const hashedPassword = await bcrypt.hash("admin123", 10);


      
      await db.query(`
        INSERT INTO users (name, email, password, role, business_id)
        VALUES ($1, $2, $3, $4, $5)
      `, ['Admin User', 'admin@smartbiz.sl', hashedPassword, 'admin', 1]);
      
      console.log("✓ Default admin user created");
      console.log("  Email: admin@smartbiz.sl");
      console.log("  Password: admin123");
    }
    
    console.log("\n✅ All database tables ready!");

    process.exit(0);
  } catch (err) {
    console.error("❌ Database setup failed:", err.message);
    process.exit(1);
  }
}

setupDatabase();
