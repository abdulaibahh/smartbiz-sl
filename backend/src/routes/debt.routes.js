const router = require("express").Router();
const db = require("../config/db");
const auth = require("../middlewares/auth");
const sub = require("../middlewares/subscription");

/* ================= GET ALL DEBTS ================= */

router.get("/all", auth, sub, async (req, res) => {
  console.log("[DEBT] GET /all - Request received");
  console.log("[DEBT] User:", req.user);
  console.log("[DEBT] Business ID:", req.user?.business_id);
  
  try {
    const debts = await db.query(
      `SELECT d.*, c.name as customer_name, c.phone as customer_phone
       FROM debts d
       LEFT JOIN customers c ON d.customer_id = c.id
       WHERE d.business_id=$1 
       ORDER BY d.created_at DESC`,
      [req.user.business_id]
    );
    console.log("[DEBT] Found:", debts.rows.length, "debts");
    res.json(debts.rows);
  } catch (err) {
    console.error("[DEBT] Get debts error:", err);
    res.status(500).json({ message: "Failed to fetch debts" });
  }
});

/* ================= GET CUSTOMER DEBT ================= */

router.get("/customer/:customerId", auth, sub, async (req, res) => {
  try {
    const { customerId } = req.params;
    
    const customer = await db.query(
      "SELECT * FROM customers WHERE id=$1 AND business_id=$2",
      [customerId, req.user.business_id]
    );
    
    if (!customer.rows.length) {
      return res.status(404).json({ message: "Customer not found" });
    }
    
    const debts = await db.query(
      "SELECT * FROM debts WHERE customer_id=$1 AND business_id=$2 ORDER BY created_at DESC",
      [customerId, req.user.business_id]
    );
    
    const totalDebt = debts.rows.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
    const totalPaid = debts.rows.reduce((sum, d) => sum + (parseFloat(d.payment_amount) || 0), 0);
    const balance = totalDebt - totalPaid;
    
    res.json({
      customer: customer.rows[0],
      totalDebt,
      totalPaid,
      balance,
      debts: debts.rows
    });
  } catch (err) {
    console.error("Get customer debt error:", err);
    res.status(500).json({ message: "Failed to fetch customer debt" });
  }
});

/* ================= RECORD DEBT PAYMENT ================= */

router.post("/payment", auth, sub, async (req, res) => {
  console.log("[DEBT PAYMENT] Request received");
  console.log("[DEBT PAYMENT] Body:", req.body);
  console.log("[DEBT PAYMENT] User:", req.user);
  
  try {
    const { debtId, amount, notes } = req.body;
    
    if (!debtId || !amount) {
      console.log("[DEBT PAYMENT] Missing debtId or amount");
      return res.status(400).json({ message: "Debt ID and amount are required" });
    }
    
    console.log("[DEBT PAYMENT] Looking for debt:", debtId, "business:", req.user.business_id);
    
    const debt = await db.query(
      "SELECT * FROM debts WHERE id=$1 AND business_id=$2",
      [debtId, req.user.business_id]
    );
    
    if (!debt.rows.length) {
      console.log("[DEBT PAYMENT] Debt not found:", debtId);
      return res.status(404).json({ message: "Debt not found" });
    }
    
    console.log("[DEBT PAYMENT] Debt found:", debt.rows[0]);
    
    const debtRecord = debt.rows[0];
    const paymentAmount = parseFloat(amount);
    const currentAmount = parseFloat(debtRecord.amount);
    const currentPaid = parseFloat(debtRecord.payment_amount) || 0;
    const newPaid = currentPaid + paymentAmount;
    const newBalance = currentAmount - newPaid;
    
    console.log("[DEBT PAYMENT] Payment:", paymentAmount, "Current:", currentPaid, "New:", newPaid, "Balance:", newBalance);
    
    let status = "partial";
    if (newBalance <= 0) {
      status = "paid";
    }
    
    // Record individual payment
    console.log("[DEBT PAYMENT] Inserting payment record...");
    await db.query(
      "INSERT INTO debt_payments (debt_id, business_id, amount, notes, payment_date) VALUES ($1, $2, $3, $4, NOW())",
      [debtId, req.user.business_id, paymentAmount, notes || null]
    );
    console.log("[DEBT PAYMENT] Payment record inserted");
    
    // Update debt totals
    console.log("[DEBT PAYMENT] Updating debt record...");
    try {
      await db.query(
        "UPDATE debts SET payment_amount=$1, status=$2, updated_at=NOW() WHERE id=$3",
        [newPaid, status, debtId]
      );
    } catch (updateErr) {
      if (updateErr.message.includes('column "updated_at" does not exist')) {
        console.log("[DEBT PAYMENT] updated_at column not found, updating without it");
        await db.query(
          "UPDATE debts SET payment_amount=$1, status=$2 WHERE id=$3",
          [newPaid, status, debtId]
        );
      } else {
        throw updateErr;
      }
    }
    console.log("[DEBT PAYMENT] Debt updated successfully");
    
    // Update customer total debt
    if (debtRecord.customer_id) {
      const customer = await db.query(
        "SELECT total_debt FROM customers WHERE id=$1",
        [debtRecord.customer_id]
      );
      
      if (customer.rows.length > 0) {
        const currentTotalDebt = parseFloat(customer.rows[0].total_debt) || 0;
        const newTotalDebt = Math.max(0, currentTotalDebt - paymentAmount);
        await db.query(
          "UPDATE customers SET total_debt=$1 WHERE id=$2",
          [newTotalDebt, debtRecord.customer_id]
        );
        console.log("[DEBT PAYMENT] Customer debt updated");
      }
    }
    
    res.json({ 
      message: "Payment recorded successfully",
      paymentAmount,
      newBalance: Math.max(0, newBalance),
      status
    });
  } catch (err) {
    console.error("[DEBT PAYMENT] Error:", err);
    console.error("[DEBT PAYMENT] Stack:", err.stack);
    res.status(500).json({ message: "Failed to record payment" });
  }
});

/* ================= GET DEBT PAYMENT HISTORY ================= */

router.get("/payments/:debtId", auth, sub, async (req, res) => {
  try {
    const { debtId } = req.params;
    
    const debt = await db.query(
      "SELECT * FROM debts WHERE id=$1 AND business_id=$2",
      [debtId, req.user.business_id]
    );
    
    if (!debt.rows.length) {
      return res.status(404).json({ message: "Debt not found" });
    }
    
    const payments = await db.query(
      "SELECT * FROM debt_payments WHERE debt_id=$1 ORDER BY payment_date DESC",
      [debtId]
    );
    
    res.json(payments.rows);
  } catch (err) {
    console.error("Get debt payments error:", err);
    res.status(500).json({ message: "Failed to fetch payment history" });
  }
});

/* ================= CREATE NEW DEBT ================= */

router.post("/", auth, sub, async (req, res) => {
  try {
    const { customer_id, amount, description, due_date } = req.body;
    
    if (!customer_id || !amount) {
      return res.status(400).json({ message: "Customer ID and amount are required" });
    }
    
    const customer = await db.query(
      "SELECT * FROM customers WHERE id=$1 AND business_id=$2",
      [customer_id, req.user.business_id]
    );
    
    if (!customer.rows.length) {
      return res.status(404).json({ message: "Customer not found" });
    }
    
    const result = await db.query(
      `INSERT INTO debts (business_id, customer_id, amount, description, due_date, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
       RETURNING *`,
      [req.user.business_id, customer_id, amount, description || null, due_date || null]
    );
    
    res.status(201).json({
      message: "Debt recorded successfully",
      debt: result.rows[0]
    });
  } catch (err) {
    console.error("Create debt error:", err);
    res.status(500).json({ message: "Failed to record debt" });
  }
});

/* ================= GET DEBT SUMMARY ================= */

router.get("/summary", auth, sub, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        COUNT(*) as total_debts,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(payment_amount), 0) as total_paid,
        COALESCE(SUM(amount - COALESCE(payment_amount, 0)), 0) as total_outstanding,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'partial' THEN 1 END) as partial_count,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count
       FROM debts 
       WHERE business_id=$1`,
      [req.user.business_id]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Debt summary error:", err);
    res.status(500).json({ message: "Failed to fetch debt summary" });
  }
});

module.exports = router;
