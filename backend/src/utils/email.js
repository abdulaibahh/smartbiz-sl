const nodemailer = require("nodemailer");

// Create transporter (configure with your SMTP settings)
const createTransporter = () => {
  if (!process.env.SMTP_HOST) {
    console.log("⚠️ SMTP not configured - emails disabled");
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Send receipt email
async function sendReceiptEmail(to, pdfBuffer, saleDetails) {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log("📧 Email skipped - SMTP not configured");
    return { success: false, reason: "SMTP not configured" };
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@smartbiz.sl",
      to,
      subject: `Receipt from ${saleDetails.businessName || "SmartBiz"} - #${saleDetails.receiptNumber}`,
      text: `Thank you for your purchase!\n\nReceipt #: ${saleDetails.receiptNumber}\nTotal: Le ${saleDetails.total}\nPaid: Le ${saleDetails.paid}\n\nPowered by SmartBiz-SL`,
      attachments: [
        {
          filename: `receipt-${saleDetails.receiptNumber}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    console.log(`📧 Receipt email sent to ${to}`);
    return { success: true };
  } catch (err) {
    console.error("📧 Email error:", err.message);
    return { success: false, reason: err.message };
  }
}

module.exports = { sendReceiptEmail };
