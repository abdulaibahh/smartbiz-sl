const db = require("./src/config/db");

async function setupDatabase() {
  console.log("Setting up database tables...");
  
  try {
    // Create customers table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES businesses(id),
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✓ Customers table created/exists");
    
    // Check if customers table has data
    const result = await db.query("SELECT COUNT(*) FROM customers");
    console.log(`✓ Customers table has ${result.rows[0].count} records`);
    
    console.log("\nDatabase setup complete!");
    process.exit(0);
  } catch (err) {
    console.error("Database setup failed:", err.message);
    process.exit(1);
  }
}

setupDatabase();
