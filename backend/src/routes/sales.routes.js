const router = require("express").Router();
const db = require("../config/db");
const auth = require("../middlewares/auth");
const sub = require("../middlewares/subscription");
const { generateReceiptPDF } = require("../utils/receipt");
const { sendReceiptEmail } = require("../utils/email");

/* ================= NEW SALE (with items) ================= */

router.post("/sale", auth, sub, async (req, res) => {
  try {
    const { items, paid, customer, customerId, sendEmail, customerEmail, sale_type } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "At least one item is required" });
    }

    // Determine sale type (default to retail)
    const saleType = sale_type || 'retail';

    // Calculate total from items
    let totalAmount = 0;
    const saleItems = [];
    
    for (const item of items) {
      const { productId, product, quantity, unitPrice } = item;
      const qty = parseInt(quantity) || 1;
      const price = parseFloat(unitPrice) || 0;
      const itemTotal = qty * price;
      totalAmount += itemTotal;
      
      saleItems.push({
        productId,
        product,
        quantity: qty,
        unitPrice: price,
        total: itemTotal
      });
    }

    const paidAmount = parseFloat(paid) || 0;
    const debt = Math.max(0, totalAmount - paidAmount);
    const customerName = customer || "Walk-in Customer";

    // Generate business-specific receipt number
    const receiptResult = await db.query(
      "SELECT COALESCE(MAX(receipt_number), 0) as max_receipt FROM sales WHERE business_id = $1",
      [req.user.business_id]
    );
    const nextReceiptNumber = (parseInt(receiptResult.rows[0].max_receipt) || 0) + 1;

    // Insert sale with sale_type and receipt_number
    const sale = await db.query(
      "INSERT INTO sales(business_id, total, paid, customer, sale_type, receipt_number) VALUES($1, $2, $3, $4, $5, $6) RETURNING id, created_at",
      [req.user.business_id, totalAmount, paidAmount, customerName, saleType, nextReceiptNumber]
    );

    const saleId = sale.rows[0].id;
    const saleCreatedAt = sale.rows[0].created_at;

    // Insert sale items
    for (const item of saleItems) {
      await db.query(
        "INSERT INTO sales_items(sale_id, product_id, product_name, quantity, unit_price, total) VALUES($1, $2, $3, $4, $5, $6)",
        [saleId, item.productId || null, item.product, item.quantity, item.unitPrice, item.total]
      );
    }

    // Update inventory quantities based on sale_type
    for (const item of saleItems) {
      if (item.productId) {
        if (saleType === 'retail') {
          // Decrease retail stock
          await db.query(
            "UPDATE inventory SET retail_quantity = COALESCE(retail_quantity, 0) - $1 WHERE id = $2 AND business_id = $3",
            [item.quantity, item.productId, req.user.business_id]
          );
        } else if (saleType === 'wholesale') {
          // Decrease wholesale stock
          await db.query(
            "UPDATE inventory SET wholesale_quantity = COALESCE(wholesale_quantity, 0) - $1 WHERE id = $2 AND business_id = $3",
            [item.quantity, item.productId, req.user.business_id]
          );
        }
      }
    }

    // If there's debt, create debt record
    if (debt > 0) {
      await db.query(
        "INSERT INTO debts(business_id, customer, amount) VALUES($1, $2, $3)",
        [req.user.business_id, customerName, debt]
      );
    }

    // Generate PDF receipt
    let pdfBase64 = null;
    try {
      const pdfBuffer = await generateReceiptPDF(saleId, req.user.business_id);
      pdfBase64 = pdfBuffer.toString("base64");

      if (sendEmail && customerEmail) {
        const businessResult = await db.query(
          "SELECT name, shop_name FROM businesses WHERE id = $1",
          [req.user.business_id]
        );
        const business = businessResult.rows[0] || {};

        await sendReceiptEmail(customerEmail, pdfBuffer, {
          receiptNumber: saleId,
          total: totalAmount.toLocaleString(),
          paid: paidAmount.toLocaleString(),
          businessName: business.shop_name || business.name
        });
      }
    } catch (pdfErr) {
      console.error("PDF generation error:", pdfErr.message);
    }

    res.json({ 
      message: "Sale recorded", 
      saleId,
      receiptNumber: nextReceiptNumber,
      saleType,
      receipt: pdfBase64 ? `data:application/pdf;base64,${pdfBase64}` : null
    });
  } catch (err) {
    console.error("Sale error:", err);
    res.status(500).json({ message: "Failed to record sale" });
  }
});

/* ================= QUICK SALE (legacy) ================= */

router.post("/quick", auth, sub, async (req, res) => {
  try {
    const { total, paid, customer, sendEmail, customerEmail, sale_type } = req.body;

    if (!total) {
      return res.status(400).json({ message: "Total amount required" });
    }

    const totalAmount = parseFloat(total);
    const paidAmount = parseFloat(paid) || 0;
    const debt = totalAmount - paidAmount;
    const customerName = customer || "Walk-in Customer";
    const saleType = sale_type || 'retail';

    // Generate business-specific receipt number
    const receiptResult = await db.query(
      "SELECT COALESCE(MAX(receipt_number), 0) as max_receipt FROM sales WHERE business_id = $1",
      [req.user.business_id]
    );
    const nextReceiptNumber = (parseInt(receiptResult.rows[0].max_receipt) || 0) + 1;

    // Insert sale with receipt_number
    const sale = await db.query(
      "INSERT INTO sales(business_id, total, paid, customer, sale_type, receipt_number) VALUES($1, $2, $3, $4, $5, $6) RETURNING id, created_at",
      [req.user.business_id, totalAmount, paidAmount, customerName, saleType, nextReceiptNumber]
    );

    const saleId = sale.rows[0].id;
    const saleCreatedAt = sale.rows[0].created_at;

    // If there's debt, create debt record
    if (debt > 0) {
      await db.query(
        "INSERT INTO debts(business_id, customer, amount) VALUES($1, $2, $3)",
        [req.user.business_id, customerName, debt]
      );
    }

    // Generate PDF receipt
    let pdfBase64 = null;
    try {
      const pdfBuffer = await generateReceiptPDF(saleId, req.user.business_id);
      pdfBase64 = pdfBuffer.toString("base64");

      // Send email if requested and email provided
      if (sendEmail && customerEmail) {
        const businessResult = await db.query(
          "SELECT name, shop_name FROM businesses WHERE id = $1",
          [req.user.business_id]
        );
        const business = businessResult.rows[0] || {};

        await sendReceiptEmail(customerEmail, pdfBuffer, {
          receiptNumber: saleId,
          total: totalAmount.toLocaleString(),
          paid: paidAmount.toLocaleString(),
          businessName: business.shop_name || business.name
        });
      }
    } catch (pdfErr) {
      console.error("PDF generation error:", pdfErr.message);
    }

    res.json({ 
      message: "Sale recorded", 
      saleId,
      receiptNumber: nextReceiptNumber,
      saleType,
      receipt: pdfBase64 ? `data:application/pdf;base64,${pdfBase64}` : null
    });
  } catch (err) {
    console.error("Quick sale error:", err);
    res.status(500).json({ message: "Failed to record sale" });
  }
});

/* ================= GET ALL SALES ================= */

router.get("/all", auth, async (req, res) => {
  console.log("[SALES] GET /all - Request received");
  console.log("[SALES] User:", req.user);
  console.log("[SALES] Business ID:", req.user?.business_id);
  
  try {
    const sales = await db.query(
      "SELECT * FROM sales WHERE business_id=$1 ORDER BY created_at DESC",
      [req.user.business_id]
    );
    console.log("[SALES] Found:", sales.rows.length, "sales");
    res.json(sales.rows);
  } catch (err) {
    console.error("[SALES] Get sales error:", err);
    res.status(500).json({ message: "Failed to fetch sales" });
  }
});

/* ================= GET RECEIPT PDF ================= */

router.get("/receipt/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const pdfBuffer = await generateReceiptPDF(id, req.user.business_id);
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=receipt-${id}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error("Get receipt error:", err);
    res.status(500).json({ message: "Failed to generate receipt" });
  }
});

module.exports = router;
