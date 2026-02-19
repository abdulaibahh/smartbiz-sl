const router = require("express").Router();
const db = require("../config/db");
const auth = require("../middlewares/auth");

// Get all customers
router.get("/all", auth, async (req, res) => {
  try {
    const customers = await db.query(
      "SELECT * FROM customers WHERE business_id=$1 ORDER BY name",
      [req.user.business_id]
    );
    res.json(customers.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch customers" });
  }
});

// Get single customer
router.get("/:id", auth, async (req, res) => {
  try {
    const customer = await db.query(
      "SELECT * FROM customers WHERE id=$1 AND business_id=$2",
      [req.params.id, req.user.business_id]
    );
    
    if (!customer.rows.length) {
      return res.status(404).json({ message: "Customer not found" });
    }
    
    res.json(customer.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch customer" });
  }
});

// Create customer
router.post("/", auth, async (req, res) => {
  const { name, email, phone, address, notes } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: "Customer name is required" });
  }

  try {
    const result = await db.query(
      "INSERT INTO customers(business_id, name, email, phone, address, notes) VALUES($1, $2, $3, $4, $5, $6) RETURNING *",
      [req.user.business_id, name, email || null, phone || null, address || null, notes || null]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create customer error:", err);
    // Check if table doesn't exist
    if (err.message && err.message.includes('relation "customers" does not exist')) {
      return res.status(500).json({ 
        message: "Database not set up properly. Please run the SQL schema to create the customers table." 
      });
    }
    res.status(500).json({ message: "Failed to create customer: " + (err.message || "Unknown error") });
  }
});

// Update customer
router.put("/:id", auth, async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, address, notes } = req.body;

  try {
    const result = await db.query(
      `UPDATE customers 
       SET name=$1, email=$2, phone=$3, address=$4, notes=$5, updated_at=NOW() 
       WHERE id=$6 AND business_id=$7 
       RETURNING *`,
      [name, email, phone, address, notes, id, req.user.business_id]
    );
    
    if (!result.rows.length) {
      return res.status(404).json({ message: "Customer not found" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update customer" });
  }
});

// Delete customer
router.delete("/:id", auth, async (req, res) => {
  try {
    await db.query(
      "DELETE FROM customers WHERE id=$1 AND business_id=$2",
      [req.params.id, req.user.business_id]
    );
    res.json({ message: "Customer deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete customer" });
  }
});

// Get customer purchase history
router.get("/:id/history", auth, async (req, res) => {
  try {
    const customer = await db.query(
      "SELECT name FROM customers WHERE id=$1 AND business_id=$2",
      [req.params.id, req.user.business_id]
    );
    
    if (!customer.rows.length) {
      return res.status(404).json({ message: "Customer not found" });
    }
    
    const customerName = customer.rows[0].name;
    
    const sales = await db.query(
      "SELECT * FROM sales WHERE business_id=$1 AND customer=$2 ORDER BY created_at DESC",
      [req.user.business_id, customerName]
    );
    
    // Calculate totals
    const totalSpent = sales.rows.reduce((sum, s) => sum + parseFloat(s.total || 0), 0);
    const totalPaid = sales.rows.reduce((sum, s) => sum + parseFloat(s.paid || 0), 0);
    
    res.json({
      customer: customerName,
      purchaseCount: sales.rows.length,
      totalSpent,
      totalPaid,
      sales: sales.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch customer history" });
  }
});

module.exports = router;
