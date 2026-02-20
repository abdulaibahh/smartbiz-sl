require("dotenv").config();
const db = require("./src/config/db");

async function checkUsers() {
  try {
    const users = await db.query("SELECT id, name, email, business_id FROM users");
    console.log("Users:", JSON.stringify(users.rows, null, 2));
    
    const businesses = await db.query("SELECT id, name, trial_end, subscription_active FROM businesses");
    console.log("Businesses:", JSON.stringify(businesses.rows, null, 2));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit();
  }
}

checkUsers();
