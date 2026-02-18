const router = require("express").Router();
const db = require("../config/db");
const auth = require("../middlewares/auth");
const sub = require("../middlewares/subscription");

// Get all inventory
router.get("/all", auth, async (req, res) => {
  try {
    const inventory = await db.query(
      "SELECT * FROM inventory WHERE business_id=$1 ORDER BY product",
      [req.user.business_id]
    );
    res.json(inventory.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch inventory" });
  }
});

// Supplier order - add stock
router.post("/supplier-order", auth, sub, async (req, res) => {
  const { product, quantity, cost_price, selling_price } = req.body;

  if (!product || !quantity) {
    return res.status(400).json({ message: "Product and quantity required" });
  }

  try {
    const existing = await db.query(
      "SELECT * FROM inventory WHERE business_id=$1 AND product=$2",
      [req.user.business_id, product]
    );

    if (existing.rows.length) {
      // Update existing product - keep original prices unless explicitly provided
      const updates = ["quantity = quantity + $1", "updated_at = NOW()"];
      const params = [quantity];
      let paramIndex = 2;
      
      if (cost_price !== undefined) {
        updates.push(`cost_price = ${paramIndex++}`);
        params.push(cost_price);
      }
      if (selling_price !== undefined) {
        updates.push(`selling_price = ${paramIndex++}`);
        params.push(selling_price);
      }
      
      params.push(req.user.business_id, product);
      
      await db.query(
        `UPDATE inventory SET ${updates.join(", ")} WHERE business_id=${paramIndex} AND product=${paramIndex + 1}`,
        params
      );
    } else {
      // Insert new product with prices
      await db.query(
        "INSERT INTO inventory(business_id, product, quantity, cost_price, selling_price, updated_at) VALUES($1, $2, $3, $4, $5, NOW())",
        [req.user.business_id, product, quantity, cost_price || 0, selling_price || 0]
      );
    }

    res.json({ message: "Inventory updated" });
  } catch (err) {
    console.error(err);
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
    
    updates.push("updated_at = NOW()");
    params.push(id, req.user.business_id);

    if (updates.length > 1) {
      await db.query(
        `UPDATE inventory SET ${updates.join(", ")} WHERE id = ${paramIndex} AND business_id = ${paramIndex + 1}`,
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
