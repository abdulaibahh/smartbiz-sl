const router = require("express").Router();
const db = require("../config/db");
const auth = require("../middlewares/auth");
const sub = require("../middlewares/subscription");

// Get all inventory
router.get("/all", auth, async (req, res) => {
  console.log("[INVENTORY] GET /all - Request received");
  console.log("[INVENTORY] User:", req.user);
  console.log("[INVENTORY] Business ID:", req.user?.business_id);
  
  try {
    // First, add columns if they don't exist
    try {
      await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS retail_quantity INTEGER DEFAULT 0`);
      await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS wholesale_quantity INTEGER DEFAULT 0`);
      await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS retail_cost_price NUMERIC DEFAULT 0`);
      await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS wholesale_cost_price NUMERIC DEFAULT 0`);
      await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS retail_price NUMERIC DEFAULT 0`);
      await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS wholesale_price NUMERIC DEFAULT 0`);
      console.log("[INVENTORY] Columns added successfully");
    } catch (colErr) {
      console.log("[INVENTORY] Columns note:", colErr.message);
    }
    
    // Now copy data from legacy columns to new columns
    try {
      await db.query(`
        UPDATE inventory SET 
          retail_quantity = COALESCE(retail_quantity, quantity),
          wholesale_quantity = COALESCE(wholesale_quantity, 0),
          retail_cost_price = COALESCE(retail_cost_price, cost_price),
          wholesale_cost_price = COALESCE(wholesale_cost_price, 0),
          retail_price = COALESCE(retail_price, selling_price),
          wholesale_price = COALESCE(wholesale_price, selling_price)
        WHERE business_id = $1
          AND (retail_price IS NULL OR retail_price = 0 OR wholesale_price IS NULL OR wholesale_price = 0)
      `, [req.user.business_id]);
      console.log("[INVENTORY] Data migrated successfully");
    } catch (migErr) {
      console.log("[INVENTORY] Migration note:", migErr.message);
    }
    
    const inventory = await db.query(
      "SELECT * FROM inventory WHERE business_id=$1 ORDER BY product",
      [req.user.business_id]
    );
    console.log("[INVENTORY] Found:", inventory.rows.length, "items");
    
    // Log first item to debug
    if (inventory.rows.length > 0) {
      console.log("[INVENTORY] First item sample:", JSON.stringify(inventory.rows[0]));
    }
    
    res.json(inventory.rows);
  } catch (err) {
    console.error("[INVENTORY] Get inventory error:", err);
    res.status(500).json({ message: "Failed to fetch inventory" });
  }
});

// Add retail stock
router.post("/retail", auth, sub, async (req, res) => {
  const { product, quantity, cost_price, retail_price } = req.body;

  if (!product || !quantity) {
    return res.status(400).json({ message: "Product and quantity required" });
  }

  try {
    const existing = await db.query(
      "SELECT * FROM inventory WHERE business_id=$1 AND product=$2",
      [req.user.business_id, product]
    );

    // Use retail_price as selling_price if not provided
    const price = retail_price || 0;
    const cost = cost_price || 0;

    if (existing.rows.length) {
      await db.query(
        "UPDATE inventory SET retail_quantity = COALESCE(retail_quantity, 0) + $1, retail_price = $2, selling_price = $2, cost_price = $3, wholesale_price = COALESCE(wholesale_price, $2), updated_at = NOW() WHERE business_id = $4 AND product = $5",
        [quantity, price, cost, req.user.business_id, product]
      );
    } else {
      await db.query(
        "INSERT INTO inventory(business_id, product, retail_quantity, cost_price, retail_price, selling_price, wholesale_price, quantity, updated_at) VALUES($1, $2, $3, $4, $5, $5, $5, $3, NOW())",
        [req.user.business_id, product, quantity, cost, price]
      );
    }

    res.json({ message: "Retail stock added" });
  } catch (err) {
    console.error("[INVENTORY] Error:", err);
    res.status(500).json({ message: "Failed to add retail stock" });
  }
});

// Add wholesale stock
router.post("/wholesale", auth, sub, async (req, res) => {
  const { product, quantity, cost_price, wholesale_price } = req.body;

  if (!product || !quantity) {
    return res.status(400).json({ message: "Product and quantity required" });
  }

  try {
    const existing = await db.query(
      "SELECT * FROM inventory WHERE business_id=$1 AND product=$2",
      [req.user.business_id, product]
    );

    // Use wholesale_price as selling_price if not provided
    const price = wholesale_price || 0;
    const cost = cost_price || 0;

    if (existing.rows.length) {
      await db.query(
        "UPDATE inventory SET wholesale_quantity = COALESCE(wholesale_quantity, 0) + $1, wholesale_price = $2, selling_price = $2, cost_price = $3, retail_price = COALESCE(retail_price, $2), updated_at = NOW() WHERE business_id = $4 AND product = $5",
        [quantity, price, cost, req.user.business_id, product]
      );
    } else {
      await db.query(
        "INSERT INTO inventory(business_id, product, wholesale_quantity, cost_price, wholesale_price, selling_price, retail_price, quantity, updated_at) VALUES($1, $2, $3, $4, $5, $5, $5, $3, NOW())",
        [req.user.business_id, product, quantity, cost, price]
      );
    }

    res.json({ message: "Wholesale stock added" });
  } catch (err) {
    console.error("[INVENTORY] Error:", err);
    res.status(500).json({ message: "Failed to add wholesale stock" });
  }
});

// Supplier order - add stock (legacy support with stock_type)
router.post("/supplier-order", auth, sub, async (req, res) => {
  console.log("[INVENTORY] POST /supplier-order - Request received");
  console.log("[INVENTORY] Body:", req.body);
  console.log("[INVENTORY] User:", req.user);
  
  const { product, quantity, cost_price, selling_price, stock_type } = req.body;

  if (!product || !quantity) {
    console.log("[INVENTORY] Missing product or quantity");
    return res.status(400).json({ message: "Product and quantity required" });
  }

  try {
    console.log("[INVENTORY] Checking for existing product:", product);
    const existing = await db.query(
      "SELECT * FROM inventory WHERE business_id=$1 AND product=$2",
      [req.user.business_id, product]
    );
    console.log("[INVENTORY] Existing product:", existing.rows.length > 0 ? "Found" : "Not found");

    // Determine stock type: retail, wholesale, or both
    const isRetail = stock_type === 'retail' || stock_type === 'both' || !stock_type;
    const isWholesale = stock_type === 'wholesale' || stock_type === 'both';

    if (existing.rows.length) {
      console.log("[INVENTORY] Updating existing product");
      
      // Build update query based on stock type
      let updateQuery = "UPDATE inventory SET ";
      const updates = [];
      const params = [];
      let paramIndex = 1;

      if (isRetail) {
        updates.push(`retail_quantity = COALESCE(retail_quantity, 0) + ${paramIndex++}`);
        params.push(quantity);
      }
      if (isWholesale) {
        updates.push(`wholesale_quantity = COALESCE(wholesale_quantity, 0) + ${paramIndex++}`);
        params.push(quantity);
      }
      if (cost_price !== undefined) {
        updates.push(`cost_price = ${paramIndex++}`);
        params.push(cost_price);
      }
      if (selling_price !== undefined) {
        // Always update selling_price for backward compatibility
        updates.push(`selling_price = ${paramIndex++}`);
        params.push(selling_price);
        if (isRetail) {
          updates.push(`retail_price = ${paramIndex++}`);
          params.push(selling_price);
        }
        if (isWholesale) {
          updates.push(`wholesale_price = ${paramIndex++}`);
          params.push(selling_price);
        }
      }
      updates.push(`updated_at = NOW()`);
      
      updateQuery += updates.join(", ") + ` WHERE business_id = $${paramIndex++} AND product = $${paramIndex}`;
      params.push(req.user.business_id, product);
      
      await db.query(updateQuery, params);
    } else {
      console.log("[INVENTORY] Inserting new product");
      
      const retailQty = isRetail ? quantity : 0;
      const wholesaleQty = isWholesale ? quantity : 0;
      const retailPrice = selling_price || 0;
      const wholesalePrice = selling_price || 0;
      
      await db.query(
        "INSERT INTO inventory(business_id, product, retail_quantity, wholesale_quantity, cost_price, retail_price, wholesale_price, selling_price, quantity, updated_at) VALUES($1, $2, $3, $4, $5, $6, $7, $6, $3, NOW())",
        [req.user.business_id, product, retailQty, wholesaleQty, cost_price || 0, retailPrice, wholesalePrice]
      );
    }

    console.log("[INVENTORY] Success!");
    res.json({ message: "Inventory updated" });
  } catch (err) {
    console.error("[INVENTORY] Error:", err);
    res.status(500).json({ message: "Failed to update inventory" });
  }
});

// Update inventory quantity and prices
router.put("/:id", auth, async (req, res) => {
  const { id } = req.params;
  const { quantity, cost_price, selling_price, retail_quantity, wholesale_quantity, retail_price, wholesale_price } = req.body;

  try {
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (retail_quantity !== undefined) {
      updates.push(`retail_quantity = $${paramIndex++}`);
      params.push(retail_quantity);
    }
    if (wholesale_quantity !== undefined) {
      updates.push(`wholesale_quantity = $${paramIndex++}`);
      params.push(wholesale_quantity);
    }
    if (cost_price !== undefined) {
      updates.push(`cost_price = $${paramIndex++}`);
      params.push(cost_price);
    }
    if (retail_price !== undefined) {
      updates.push(`retail_price = $${paramIndex++}`);
      params.push(retail_price);
    }
    if (wholesale_price !== undefined) {
      updates.push(`wholesale_price = $${paramIndex++}`);
      params.push(wholesale_price);
    }
    if (selling_price !== undefined) {
      // Backward compatibility - set both prices
      updates.push(`retail_price = $${paramIndex++}`);
      params.push(selling_price);
      updates.push(`wholesale_price = $${paramIndex++}`);
      params.push(selling_price);
    }
    
    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      params.push(id, req.user.business_id);
      
      await db.query(
        `UPDATE inventory SET ${updates.join(", ")} WHERE id = $${paramIndex++} AND business_id = $${paramIndex}`,
        params
      );
    }
    
    res.json({ message: "Inventory updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update inventory" });
  }
});

// Delete inventory item
router.delete("/:id", auth, async (req, res) => {
  const { id } = req.params;

  try {
    await db.query(
      "DELETE FROM inventory WHERE id=$1 AND business_id=$2",
      [id, req.user.business_id]
    );
    res.json({ message: "Item deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete item" });
  }
});

module.exports = router;
