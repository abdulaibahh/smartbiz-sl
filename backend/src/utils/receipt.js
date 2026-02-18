const PDFDocument = require("pdfkit");
const db = require("../config/db");

// Generate receipt PDF
async function generateReceiptPDF(saleId, businessId) {
  // Get sale details
  const saleResult = await db.query(
    "SELECT * FROM sales WHERE id = $1 AND business_id = $2",
    [saleId, businessId]
  );

  if (!saleResult.rows.length) {
    throw new Error("Sale not found");
  }

  const sale = saleResult.rows[0];

  // Get business details
  const businessResult = await db.query(
    "SELECT * FROM businesses WHERE id = $1",
    [businessId]
  );

  const business = businessResult.rows[0] || {};

  return new Promise((resolve, reject) => {
    try {
      const chunks = [];
      const doc = new PDFDocument({ margin: 50 });

      doc.on("data", chunk => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Header - Logo and Business Name
      if (business.logo_url) {
        try {
          doc.image(business.logo_url, 50, 50, { width: 50, height: 50 });
        } catch (e) {
          // Skip if image fails
        }
      }

      doc.fontSize(20).font("Helvetica-Bold").text(business.shop_name || business.name || "SmartBiz", {
        align: "center"
      });
      
      doc.moveDown(0.5);
      doc.fontSize(10).font("Helvetica").text(business.address || "", { align: "center" });
      doc.text(business.phone || "", { align: "center" });
      
      // Divider
      doc.moveDown(1);
      doc.strokeColor("#cccccc").lineWidth(1);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(1);

      // Receipt Details
      doc.fontSize(12).font("Helvetica");
      doc.text(`Receipt #: ${sale.id}`);
      doc.text(`Date: ${new Date(sale.created_at).toLocaleString()}`);
      doc.text(`Customer: ${sale.customer || "Walk-in Customer"}`);
      
      // Divider
      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(1);

      // Items (for now, just showing total)
      doc.fontSize(14).font("Helvetica-Bold").text("TOTAL", 50);
      doc.text(`Le ${parseFloat(sale.total).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, 400, doc.y - 14, { align: "right" });

      // Payment Info
      doc.moveDown(2);
      doc.fontSize(11).font("Helvetica");
      doc.text(`Paid: Le ${parseFloat(sale.paid || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
      
      if (parseFloat(sale.total) > parseFloat(sale.paid || 0)) {
        const debt = parseFloat(sale.total) - parseFloat(sale.paid || 0);
        doc.text(`Outstanding: Le ${debt.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, { color: "red" });
      } else {
        doc.text("Status: PAID", { color: "green" });
      }

      // Divider
      doc.moveDown(2);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

      // Footer
      doc.moveDown(1);
      doc.fontSize(10).font("Helvetica").text("Thank you for your business!", { align: "center" });
      doc.text("Powered by SmartBiz-SL", { align: "center" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateReceiptPDF };
