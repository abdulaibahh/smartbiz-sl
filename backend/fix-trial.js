require("dotenv").config();
const db = require("./src/config/db");

async function fixTrial() {
  try {
    const result = await db.query(
      "UPDATE businesses SET trial_end = NOW() + INTERVAL '30 days' WHERE trial_end IS NULL RETURNING id, name, trial_end"
    );
    console.log("Updated businesses:", JSON.stringify(result.rows, null, 2));
    
    // Also check what's in the businesses table
    const allBiz = await db.query("SELECT id, name, trial_end, subscription_active FROM businesses");
    console.log("All businesses:", JSON.stringify(allBiz.rows, null, 2));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit();
  }
}

fixTrial();
