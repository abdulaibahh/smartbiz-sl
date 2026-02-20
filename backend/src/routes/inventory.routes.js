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
    const inventory = await db.query(
      "SELECT * FROM inventory WHERE business_id=$1 ORDER BY product",
      [req.user.business_id]
    );
    console.log("[INVENTORY] Found:", inventory.rows.length, "items");
    res.json(inventory.rows);
  } catch (err) {
    console.error("[INVENTORY] Get inventory error:", err);
    res.status(500).json({ message: "Failed to fetch inventory" });
  }
});

// Supplier order - add stock
router.post("/supplier-order", auth, sub, async (req, res) => {
  console.log("[INVENTORY] POST /supplier-order - Request received");
  console.log("[INVENTORY] Body:", req.body);
  console.log("[INVENTORY] User:", req.user);
  
  const { product, quantity, cost_price, selling_price } = req.body;

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

    if (existing.rows.length) {
      console.log("[INVENTORY] Updating existing product");
      // Update existing product - keep original prices unless explicitly provided
      if (cost_price !== undefined && selling_price !== undefined) {
        await db.query(
          "UPDATE inventory SET quantity = quantity + $1, cost_price = $2, selling_price = $3, updated_at = NOW() WHERE business_id = $4 AND product = $5",
          [quantity, cost_price, selling_price, req.user.business_id, product]
        );
      } else if (cost_price !== undefined) {
        await db.query(
          "UPDATE inventory SET quantity = quantity + $1, cost_price = $2, updated_at = NOW() WHERE business_id = $3 AND product = $4",
          [quantity, cost_price, req.user.business_id, product]
        );
      } else if (selling_price !== undefined) {
        await db.query(
          "UPDATE inventory SET quantity = quantity + $1, selling_price = $2, updated_at = NOW() WHERE business_id = $3 AND product = $4",
          [quantity, selling_price, req.user.business_id, product]
        );
      } else {
        await db.query(
          "UPDATE inventory SET quantity = quantity + $1, updated_at = NOW() WHERE business_id = $2 AND product = $3",
          [quantity, req.user.business_id, product]
        );
      }
    } else {
      console.log("[INVENTORY] Inserting new product");
      // Insert new product with prices
      await db.query(
        "INSERT INTO inventory(business_id, product, quantity, cost_price, selling_price, updated_at) VALUES($1, $2, $3, $4, $5, NOW())",
        [req.user.business_id, product, quantity, cost_price || 0, selling_price || 0]
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
  const { quantity, cost_price, selling_price } = req.body;

  try {
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (quantity !== undefined) {
      updates.push(`quantity = ${paramIndex++}`);
      params.push(quantity);
    }
    if (cost_price !== undefined) {
      updates.push(`cost_price = ${paramIndex++}`);
      params.push(cost_price);
    }
    if (selling_price !== undefined) {
      updates.push(`selling_price = ${paramIndex++}`);
      params.push(selling_price);
    }
    
    if (quantity !== undefined && cost_price !== undefined && selling_price !== undefined) {
      await db.query(
        "UPDATE inventory SET quantity = $1, cost_price = $2, selling_price = $3, updated_at = NOW() WHERE id = $4 AND business_id = $5",
        [quantity, cost_price, selling_price, id, req.user.business_id]
      );
    } else if (quantity !== undefined && cost_price !== undefined) {
      await db.query(
        "UPDATE inventory SET quantity = $1, cost_price = $2, updated_at = NOW() WHERE id = $3 AND business_id = $4",
        [quantity, cost_price, id, req.user.business_id]
      );
    } else if (quantity !== undefined && selling_price !== undefined) {
      await db.query(
        "UPDATE inventory SET quantity = $1, selling_price = $2, updated_at = NOW() WHERE id = $3 AND business_id = $4",
        [quantity, selling_price, id, req.user.business_id]
      );
    } else if (cost_price !== undefined && selling_price !== undefined) {
      await db.query(
        "UPDATE inventory SET cost_price = $1, selling_price = $2, updated_at = NOW() WHERE id = $3 AND business_id = $4",
        [cost_price, selling_price, id, req.user.business_id]
      );
    } else if (quantity !== undefined) {
      await db.query(
        "UPDATE inventory SET quantity = $1, updated_at = NOW() WHERE id = $2 AND business_id = $3",
        [quantity, id, req.user.business_id]
      );
    } else if (cost_price !== undefined) {
      await db.query(
        "UPDATE inventory SET cost_price = $1, updated_at = NOW() WHERE id = $2 AND business_id = $3",
        [cost_price, id, req.user.business_id]
      );
    } else if (selling_price !== undefined) {
      await db.query(
        "UPDATE inventory SET selling_price = $1, updated_at = NOW() WHERE id = $2 AND business_id = $3",
        [selling_price, id, req.user.business_id]
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
