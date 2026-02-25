const router = require("express").Router();
const db = require("../config/db");
const auth = require("../middlewares/auth");
const sub = require("../middlewares/subscription");
const roleAuth = require("../middlewares/role");

// Quick fix endpoint to add missing columns
router.get("/fix-columns", async (req, res) => {
  try {
    console.log("[INVENTORY] Running column fix...");
    
    // Add retail and wholesale columns to inventory table
    await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS retail_quantity INTEGER DEFAULT 0`);
    await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS wholesale_quantity INTEGER DEFAULT 0`);
    await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS retail_cost_price NUMERIC DEFAULT 0`);
    await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS wholesale_cost_price NUMERIC DEFAULT 0`);
    await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS retail_price NUMERIC DEFAULT 0`);
    await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS wholesale_price NUMERIC DEFAULT 0`);
    
    // Copy data from legacy columns
    await db.query(`UPDATE inventory SET 
      retail_quantity = COALESCE(retail_quantity, quantity),
      wholesale_quantity = COALESCE(wholesale_quantity, 0),
      retail_cost_price = COALESCE(retail_cost_price, cost_price),
      wholesale_cost_price = COALESCE(wholesale_cost_price, 0),
      retail_price = COALESCE(retail_price, selling_price),
      wholesale_price = COALESCE(wholesale_price, selling_price)
    WHERE retail_price IS NULL OR retail_price = 0`);
    
    // Add sale_type to sales table
    await db.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS sale_type TEXT DEFAULT 'retail'`);
    
    console.log("[INVENTORY] Column fix complete!");
    res.json({ message: "Columns added and data migrated successfully!" });
  } catch (err) {
    console.error("[INVENTORY] Fix error:", err.message);
    res.status(500).json({ message: "Fix failed: " + err.message });
  }
});

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
    
    const isOwner = req.user.role === 'owner';
    
    let inventory;
    if (isOwner) {
      // Owners can see all data including cost_price
      inventory = await db.query(
        "SELECT * FROM inventory WHERE business_id=$1 ORDER BY product",
        [req.user.business_id]
      );
    } else {
      // Non-owners (cashiers, managers) cannot see cost_price
      inventory = await db.query(
        "SELECT id, business_id, product, quantity, retail_quantity, wholesale_quantity, retail_price, wholesale_price, selling_price, created_at, updated_at FROM inventory WHERE business_id=$1 ORDER BY product",
        [req.user.business_id]
      );
    }
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

// Add retail stock - all users can add stock but only owners can set cost_price
router.post("/retail", auth, sub, async (req, res) => {
  let { product, quantity, cost_price, retail_price } = req.body;

  if (!product || !quantity) {
    return res.status(400).json({ message: "Product and quantity required" });
  }

  // Non-owners cannot set cost_price
  const isOwner = req.user.role === 'owner';
  if (!isOwner) {
    cost_price = undefined;
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
      // Non-owners can only add quantity, cannot update cost_price
      if (isOwner) {
        await db.query(
          "UPDATE inventory SET retail_quantity = COALESCE(retail_quantity, 0) + $1, retail_price = $2, selling_price = $2, cost_price = $3, wholesale_price = COALESCE(wholesale_price, $2), updated_at = NOW() WHERE business_id = $4 AND product = $5",
          [quantity, price, cost, req.user.business_id, product]
        );
      } else {
        await db.query(
          "UPDATE inventory SET retail_quantity = COALESCE(retail_quantity, 0) + $1, retail_price = $2, selling_price = $2, wholesale_price = COALESCE(wholesale_price, $2), updated_at = NOW() WHERE business_id = $3 AND product = $4",
          [quantity, price, req.user.business_id, product]
        );
      }
    } else {
      // New product - owner can set cost_price, non-owners cannot
      if (isOwner) {
        await db.query(
          "INSERT INTO inventory(business_id, product, retail_quantity, cost_price, retail_price, selling_price, wholesale_price, quantity, updated_at) VALUES($1, $2, $3, $4, $5, $5, $5, $3, NOW())",
          [req.user.business_id, product, quantity, cost, price]
        );
      } else {
        await db.query(
          "INSERT INTO inventory(business_id, product, retail_quantity, retail_price, selling_price, wholesale_price, quantity, updated_at) VALUES($1, $2, $3, $4, $4, $4, $3, NOW())",
          [req.user.business_id, product, quantity, price]
        );
      }
    }

    res.json({ message: "Retail stock added" });
  } catch (err) {
    console.error("[INVENTORY] Error:", err);
    res.status(500).json({ message: "Failed to add retail stock" });
  }
});

// Add wholesale stock - all users can add stock but only owners can set cost_price
router.post("/wholesale", auth, sub, async (req, res) => {
  let { product, quantity, cost_price, wholesale_price } = req.body;

  if (!product || !quantity) {
    return res.status(400).json({ message: "Product and quantity required" });
  }

  // Non-owners cannot set cost_price
  const isOwner = req.user.role === 'owner';
  if (!isOwner) {
    cost_price = undefined;
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
      // Non-owners can only add quantity, cannot update cost_price
      if (isOwner) {
        await db.query(
          "UPDATE inventory SET wholesale_quantity = COALESCE(wholesale_quantity, 0) + $1, wholesale_price = $2, selling_price = $2, cost_price = $3, retail_price = COALESCE(retail_price, $2), updated_at = NOW() WHERE business_id = $4 AND product = $5",
          [quantity, price, cost, req.user.business_id, product]
        );
      } else {
        await db.query(
          "UPDATE inventory SET wholesale_quantity = COALESCE(wholesale_quantity, 0) + $1, wholesale_price = $2, selling_price = $2, retail_price = COALESCE(retail_price, $2), updated_at = NOW() WHERE business_id = $3 AND product = $4",
          [quantity, price, req.user.business_id, product]
        );
      }
    } else {
      // New product - owner can set cost_price, non-owners cannot
      if (isOwner) {
        await db.query(
          "INSERT INTO inventory(business_id, product, wholesale_quantity, cost_price, wholesale_price, selling_price, retail_price, quantity, updated_at) VALUES($1, $2, $3, $4, $5, $5, $5, $3, NOW())",
          [req.user.business_id, product, quantity, cost, price]
        );
      } else {
        await db.query(
          "INSERT INTO inventory(business_id, product, wholesale_quantity, wholesale_price, selling_price, retail_price, quantity, updated_at) VALUES($1, $2, $3, $4, $4, $4, $3, NOW())",
          [req.user.business_id, product, quantity, price]
        );
      }
    }

    res.json({ message: "Wholesale stock added" });
  } catch (err) {
    console.error("[INVENTORY] Error:", err);
    res.status(500).json({ message: "Failed to add wholesale stock" });
  }
});

// Supplier order - add stock (legacy support with stock_type)
// Adding new stock - all authenticated users with subscription can do
// Editing existing items with cost_price - owner only
router.post("/supplier-order", auth, sub, async (req, res) => {
  console.log("[INVENTORY] POST /supplier-order - Request received");
  console.log("[INVENTORY] Body:", req.body);
  console.log("[INVENTORY] User:", req.user);
  
  const { id, product, quantity, cost_price, selling_price, stock_type, retail_quantity, wholesale_quantity, retail_price, wholesale_price } = req.body;

  // If ID is provided, this is an update operation (from edit modal)
  // All users can edit, but only owners can update cost_price
  if (id) {
    const isOwner = req.user.role === 'owner';
    
    console.log("[INVENTORY] Update operation with ID:", id, "isOwner:", isOwner);
    try {
      const updates = [];
      const params = [];
      let paramIndex = 1;

      // If stock_type is 'both', set absolute quantities
      if (stock_type === 'both') {
        if (retail_quantity !== undefined) {
          updates.push(`retail_quantity = $${paramIndex++}`);
          params.push(retail_quantity);
        }
        if (wholesale_quantity !== undefined) {
          updates.push(`wholesale_quantity = $${paramIndex++}`);
          params.push(wholesale_quantity);
        }
      } else if (quantity !== undefined && quantity > 0) {
        const isRetail = stock_type === 'retail' || !stock_type;
        const isWholesale = stock_type === 'wholesale';
        if (isRetail) {
          updates.push(`retail_quantity = COALESCE(retail_quantity, 0) + $${paramIndex++}`);
          params.push(quantity);
        }
        if (isWholesale) {
          updates.push(`wholesale_quantity = COALESCE(wholesale_quantity, 0) + $${paramIndex++}`);
          params.push(quantity);
        }
      }

      // Only owners can update cost_price
      if (cost_price !== undefined && isOwner) {
        updates.push(`cost_price = $${paramIndex++}`);
        params.push(cost_price);
      }
      if (selling_price !== undefined) {
        updates.push(`selling_price = $${paramIndex++}`);
        params.push(selling_price);
      }
      if (retail_price !== undefined) {
        updates.push(`retail_price = $${paramIndex++}`);
        params.push(retail_price);
      }
      if (wholesale_price !== undefined) {
        updates.push(`wholesale_price = $${paramIndex++}`);
        params.push(wholesale_price);
      }

      if (updates.length > 0) {
        updates.push(`updated_at = NOW()`);
        params.push(id, req.user.business_id);
        const query = `UPDATE inventory SET ${updates.join(", ")} WHERE id = $${paramIndex++} AND business_id = $${paramIndex}`;
        console.log("[INVENTORY] Update query:", query);
        console.log("[INVENTORY] Update params:", params);
        const result = await db.query(query, params);
        if (result.rowCount === 0) {
          return res.status(404).json({ message: "Item not found" });
        }
        console.log("[INVENTORY] Update success!");
        return res.json({ message: "Inventory updated" });
      }
      return res.json({ message: "No changes to update" });
    } catch (err) {
      console.error("[INVENTORY] Update error:", err);
      return res.status(500).json({ message: "Failed to update inventory: " + err.message });
    }
  }

  if (!product || !quantity) {
    console.log("[INVENTORY] Missing product or quantity");
    return res.status(400).json({ message: "Product and quantity required" });
  }

  // Non-owners cannot set cost_price when adding new products
  let finalCostPrice = cost_price;
  if (req.user.role !== 'owner') {
    finalCostPrice = undefined;
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
        updates.push(`retail_quantity = COALESCE(retail_quantity, 0) + $${paramIndex++}`);
        params.push(quantity);
      }
      if (isWholesale) {
        updates.push(`wholesale_quantity = COALESCE(wholesale_quantity, 0) + $${paramIndex++}`);
        params.push(quantity);
      }
      // Only owners can update cost_price
      if (finalCostPrice !== undefined) {
        updates.push(`cost_price = $${paramIndex++}`);
        params.push(finalCostPrice);
      }
      if (selling_price !== undefined) {
        // Always update selling_price for backward compatibility
        updates.push(`selling_price = $${paramIndex++}`);
        params.push(selling_price);
        if (isRetail) {
          updates.push(`retail_price = $${paramIndex++}`);
          params.push(selling_price);
        }
        if (isWholesale) {
          updates.push(`wholesale_price = $${paramIndex++}`);
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
      
      // Only owners can set cost_price
      if (req.user.role === 'owner') {
        await db.query(
          "INSERT INTO inventory(business_id, product, retail_quantity, wholesale_quantity, cost_price, retail_price, wholesale_price, selling_price, quantity, updated_at) VALUES($1, $2, $3, $4, $5, $6, $7, $6, $3, NOW())",
          [req.user.business_id, product, retailQty, wholesaleQty, finalCostPrice || 0, retailPrice, wholesalePrice]
        );
      } else {
        await db.query(
          "INSERT INTO inventory(business_id, product, retail_quantity, wholesale_quantity, retail_price, wholesale_price, selling_price, quantity, updated_at) VALUES($1, $2, $3, $4, $5, $6, $6, $3, NOW())",
          [req.user.business_id, product, retailQty, wholesaleQty, retailPrice, wholesalePrice]
        );
      }
    }

    console.log("[INVENTORY] Success!");
    res.json({ message: "Inventory updated" });
  } catch (err) {
    console.error("[INVENTORY] Error:", err);
    res.status(500).json({ message: "Failed to update inventory" });
  }
});

// Update inventory quantity and prices (Owner only - can edit cost prices)
router.put("/:id", auth, roleAuth("owner"), async (req, res) => {
  const { id } = req.params;
  const { quantity, cost_price, selling_price, retail_quantity, wholesale_quantity, retail_price, wholesale_price } = req.body;

  console.log("[UPDATE] Request params:", req.params);
  console.log("[UPDATE] Request body:", req.body);
  console.log("[UPDATE] User business_id:", req.user?.business_id);

  try {
    // First, ensure columns exist
    try {
      await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS retail_quantity INTEGER DEFAULT 0`);
      await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS wholesale_quantity INTEGER DEFAULT 0`);
      await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS retail_price NUMERIC DEFAULT 0`);
      await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS wholesale_price NUMERIC DEFAULT 0`);
    } catch (e) {
      // Columns might already exist
    }

    // Build updates array and params array separately
    const updates = [];
    const params = [];

    // Helper function to add update and param
    const addUpdate = (field, value) => {
      if (value !== undefined) {
        updates.push(`${field} = $${params.length + 1}`);
        params.push(value);
      }
    };

    // Add all possible updates
    addUpdate('retail_quantity', retail_quantity);
    addUpdate('wholesale_quantity', wholesale_quantity);
    addUpdate('cost_price', cost_price);
    addUpdate('retail_price', retail_price);
    addUpdate('wholesale_price', wholesale_price);
    
    if (selling_price !== undefined) {
      // Backward compatibility - set both prices
      updates.push(`retail_price = $${params.length + 1}`);
      params.push(selling_price);
      updates.push(`wholesale_price = $${params.length + 1}`);
      params.push(selling_price);
    }
    
    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      
      // Add id and business_id to params at the end
      params.push(id, req.user.business_id);
      
      // Use $1, $2, $3... based on actual params position
      const query = `UPDATE inventory SET ${updates.join(", ")} WHERE id = $${params.length - 1} AND business_id = $${params.length}`;
      
      console.log("[UPDATE] Query:", query);
      console.log("[UPDATE] Params:", params);
      
      const result = await db.query(query, params);
      
      console.log("[UPDATE] Result rowCount:", result.rowCount);
      
      if (result.rowCount === 0) {
        return res.status(404).json({ message: "Item not found" });
      }
    }
    
    res.json({ message: "Inventory updated" });
  } catch (err) {
    console.error("[UPDATE] Error:", err);
    res.status(500).json({ message: "Failed to update inventory: " + err.message });
  }
});

// Delete inventory item (Owner only)
router.delete("/:id", auth, roleAuth("owner"), async (req, res) => {
  const { id } = req.params;

  console.log("[DELETE] Attempting to delete inventory item:", id);
  console.log("[DELETE] User business_id:", req.user?.business_id);

  try {
    // First, check if there are related records in sales_items
    const salesCheck = await db.query(
      "SELECT COUNT(*) as count FROM sales_items WHERE product_id = $1",
      [id]
    );
    console.log("[DELETE] Related sales_items count:", salesCheck.rows[0]?.count);

    // Check if there are related records in order_items
    const ordersCheck = await db.query(
      "SELECT COUNT(*) as count FROM order_items WHERE product_id = $1",
      [id]
    );
    console.log("[DELETE] Related order_items count:", ordersCheck.rows[0]?.count);

    // Delete related sales_items first
    if (salesCheck.rows[0]?.count > 0) {
      await db.query("DELETE FROM sales_items WHERE product_id = $1", [id]);
      console.log("[DELETE] Deleted related sales_items");
    }

    // Delete related order_items first
    if (ordersCheck.rows[0]?.count > 0) {
      await db.query("DELETE FROM order_items WHERE product_id = $1", [id]);
      console.log("[DELETE] Deleted related order_items");
    }

    // Now delete the inventory item
    const result = await db.query(
      "DELETE FROM inventory WHERE id=$1 AND business_id=$2",
      [id, req.user.business_id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Item not found" });
    }
    
    console.log("[DELETE] Item deleted successfully");
    res.json({ message: "Item deleted" });
  } catch (err) {
    console.error("[DELETE] Error:", err);
    res.status(500).json({ message: "Failed to delete item: " + err.message });
  }
});

module.exports = router;
