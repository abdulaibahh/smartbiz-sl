const router = require("express").Router();
const db = require("../config/db");
const auth = require("../middlewares/auth");
const sub = require("../middlewares/subscription");

/* ================= GET ALL ORDERS ================= */

router.get("/all", auth, sub, async (req, res) => {
  try {
    const orders = await db.query(
      `SELECT * FROM orders WHERE business_id=$1 ORDER BY created_at DESC`,
      [req.user.business_id]
    );
    res.json(orders.rows);
  } catch (err) {
    console.error("Get orders error:", err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

/* ================= GET SINGLE ORDER ================= */

router.get("/:id", auth, sub, async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await db.query(
      "SELECT * FROM orders WHERE id=$1 AND business_id=$2",
      [id, req.user.business_id]
    );
    
    if (!order.rows.length) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    // Get order items
    const items = await db.query(
      "SELECT * FROM order_items WHERE order_id=$1",
      [id]
    );
    
    res.json({
      ...order.rows[0],
      items: items.rows
    });
  } catch (err) {
    console.error("Get order error:", err);
    res.status(500).json({ message: "Failed to fetch order" });
  }
});

/* ================= CREATE ORDER ================= */

router.post("/", auth, sub, async (req, res) => {
  try {
    const { supplier_name, supplier_contact, expected_delivery_date, items, notes } = req.body;
    
    if (!supplier_name) {
      return res.status(400).json({ message: "Supplier name is required" });
    }
    
    // Calculate total amount
    let totalAmount = 0;
    if (items && items.length > 0) {
      totalAmount = items.reduce((sum, item) => {
        return sum + (parseFloat(item.quantity) * parseFloat(item.unit_price || 0));
      }, 0);
    }
    
    // Create order
    const order = await db.query(
      `INSERT INTO orders(business_id, supplier_name, supplier_contact, expected_delivery_date, total_amount, notes) 
       VALUES($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.business_id, supplier_name, supplier_contact || null, expected_delivery_date || null, totalAmount, notes || null]
    );
    
    const orderId = order.rows[0].id;
    
    // Create order items
    if (items && items.length > 0) {
      for (const item of items) {
        const itemTotal = parseFloat(item.quantity) * parseFloat(item.unit_price || 0);
        await db.query(
          `INSERT INTO order_items(order_id, product_id, product_name, quantity, unit_price, total_price) 
           VALUES($1, $2, $3, $4, $5, $6)`,
          [orderId, item.productId || null, item.product, item.quantity, item.unit_price || 0, itemTotal]
        );
      }
    }
    
    res.status(201).json({ 
      message: "Order created successfully",
      order: order.rows[0]
    });
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({ message: "Failed to create order" });
  }
});

/* ================= RECEIVE ORDER (AUTO-INCREASE STOCK) ================= */

router.put("/:id/receive", auth, sub, async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body;
    
    // Get the order
    const order = await db.query(
      "SELECT * FROM orders WHERE id=$1 AND business_id=$2",
      [id, req.user.business_id]
    );
    
    if (!order.rows.length) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    if (order.rows[0].status === "received") {
      return res.status(400).json({ message: "Order already received" });
    }
    
    // Get order items
    const orderItems = await db.query(
      "SELECT * FROM order_items WHERE order_id=$1",
      [id]
    );
    
    // Update inventory for each item
    for (const orderItem of orderItems.rows) {
      const receivedQty = orderItem.received_quantity || 0;
      const newQty = receivedQty + (items?.[orderItem.id]?.quantity || orderItem.quantity - receivedQty);
      
      // Check if product exists in inventory
      const existingProduct = await db.query(
        "SELECT * FROM inventory WHERE business_id=$1 AND product=$2",
        [req.user.business_id, orderItem.product_name]
      );
      
      if (existingProduct.rows.length) {
        // Update existing product quantity
        await db.query(
          "UPDATE inventory SET quantity = quantity + $1, updated_at=NOW() WHERE id=$2",
          [newQty, existingProduct.rows[0].id]
        );
      } else {
        // Create new product in inventory
        await db.query(
          "INSERT INTO inventory(business_id, product, quantity, cost_price, selling_price, updated_at) VALUES($1, $2, $3, $4, $5, NOW())",
          [req.user.business_id, orderItem.product_name, newQty, orderItem.unit_price, orderItem.unit_price]
        );
      }
      
      // Update received quantity
      await db.query(
        "UPDATE order_items SET received_quantity=$1 WHERE id=$2",
        [newQty, orderItem.id]
      );
    }
    
    // Update order status
    await db.query(
      "UPDATE orders SET status='received', updated_at=NOW() WHERE id=$1",
      [id]
    );
    
    res.json({ 
      message: "Order received and inventory updated successfully",
      status: "received"
    });
  } catch (err) {
    console.error("Receive order error:", err);
    res.status(500).json({ message: "Failed to receive order" });
  }
});

/* ================= DELETE ORDER ================= */

router.delete("/:id", auth, sub, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if order exists and belongs to business
    const order = await db.query(
      "SELECT * FROM orders WHERE id=$1 AND business_id=$2",
      [id, req.user.business_id]
    );
    
    if (!order.rows.length) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    if (order.rows[0].status === "received") {
      return res.status(400).json({ message: "Cannot delete a received order" });
    }
    
    await db.query("DELETE FROM orders WHERE id=$1", [id]);
    
    res.json({ message: "Order deleted successfully" });
  } catch (err) {
    console.error("Delete order error:", err);
    res.status(500).json({ message: "Failed to delete order" });
  }
});

/* ================= GET SUPPLIER PAYMENTS ================= */

router.get("/:orderId/payments", auth, sub, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const payments = await db.query(
      "SELECT * FROM supplier_payments WHERE order_id=$1 AND business_id=$2 ORDER BY created_at DESC",
      [orderId, req.user.business_id]
    );
    
    res.json(payments.rows);
  } catch (err) {
    console.error("Get payments error:", err);
    res.status(500).json({ message: "Failed to fetch payments" });
  }
});

/* ================= RECORD SUPPLIER PAYMENT ================= */

router.post("/:orderId/payment", auth, sub, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { amount, payment_method, reference_number, notes } = req.body;
    
    if (!amount || !payment_method) {
      return res.status(400).json({ message: "Amount and payment method are required" });
    }
    
    // Verify order belongs to business
    const order = await db.query(
      "SELECT * FROM orders WHERE id=$1 AND business_id=$2",
      [orderId, req.user.business_id]
    );
    
    if (!order.rows.length) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    // Create payment record
    const payment = await db.query(
      `INSERT INTO supplier_payments(business_id, order_id, amount, payment_method, reference_number, notes) 
       VALUES($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.business_id, orderId, amount, payment_method, reference_number || null, notes || null]
    );
    
    res.status(201).json({ 
      message: "Payment recorded successfully",
      payment: payment.rows[0]
    });
  } catch (err) {
    console.error("Record payment error:", err);
    res.status(500).json({ message: "Failed to record payment" });
  }
});

module.exports = router;
