const router = require("express").Router();
const db = require("../config/db");
const auth = require("../middlewares/auth");
const sub = require("../middlewares/subscription");
const { generateReceiptPDF } = require("../utils/receipt");
const { sendReceiptEmail } = require("../utils/email");

/* ================= QUICK SALE ================= */

router.post("/quick", auth, sub, async (req, res) => {
  try {
    const { total, paid, customer, sendEmail, customerEmail } = req.body;

    if (!total) {
      return res.status(400).json({ message: "Total amount required" });
    }

    const totalAmount = parseFloat(total);
    const paidAmount = parseFloat(paid) || 0;
    const debt = totalAmount - paidAmount;
    const customerName = customer || "Walk-in Customer";

    // Insert sale
    const sale = await db.query(
      "INSERT INTO sales(business_id, total, paid, customer) VALUES($1, $2, $3, $4) RETURNING id, created_at",
      [req.user.business_id, totalAmount, paidAmount, customerName]
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
      receipt: pdfBase64 ? `data:application/pdf;base64,${pdfBase64}` : null
    });
  } catch (err) {
    console.error("Quick sale error:", err);
    res.status(500).json({ message: "Failed to record sale" });
  }
});

/* ================= GET ALL SALES ================= */

router.get("/all", auth, async (req, res) => {
  try {
    const sales = await db.query(
      "SELECT * FROM sales WHERE business_id=$1 ORDER BY created_at DESC",
      [req.user.business_id]
    );
    res.json(sales.rows);
  } catch (err) {
    console.error("Get sales error:", err);
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
