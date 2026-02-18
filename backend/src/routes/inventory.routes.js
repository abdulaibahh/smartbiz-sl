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
  const { product, quantity } = req.body;

  if (!product || !quantity) {
    return res.status(400).json({ message: "Product and quantity required" });
  }

  try {
    const existing = await db.query(
      "SELECT * FROM inventory WHERE business_id=$1 AND product=$2",
      [req.user.business_id, product]
    );

    if (existing.rows.length) {
      await db.query(
        "UPDATE inventory SET quantity=quantity+$1 WHERE business_id=$2 AND product=$3",
        [quantity, req.user.business_id, product]
      );
    } else {
      await db.query(
        "INSERT INTO inventory(business_id,product,quantity) VALUES($1,$2,$3)",
        [req.user.business_id, product, quantity]
      );
    }

    res.json({ message: "Inventory updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update inventory" });
  }
});

// Update inventory quantity
router.put("/:id", auth, async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;

  try {
    await db.query(
      "UPDATE inventory SET quantity=$1 WHERE id=$2 AND business_id=$3",
      [quantity, id, req.user.business_id]
    );
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
