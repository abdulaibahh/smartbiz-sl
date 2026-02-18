const PDFDocument = require("pdfkit");
const db = require("../config/db");

// Generate advanced receipt PDF
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

  // Get sale items
  const itemsResult = await db.query(
    "SELECT * FROM sales_items WHERE sale_id = $1",
    [saleId]
  );

  // Get business details
  const businessResult = await db.query(
    "SELECT * FROM businesses WHERE id = $1",
    [businessId]
  );

  const business = businessResult.rows[0] || {};

  return new Promise((resolve, reject) => {
    try {
      const chunks = [];
      const doc = new PDFDocument({ margin: 50, size: 'A4' });

      doc.on("data", chunk => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Colors
      const primaryColor = '#4F46E5';
      const textColor = '#374151';
      const lightGray = '#9CA3AF';
      const borderColor = '#E5E7EB';

      // Header background
      doc.rect(0, 0, doc.page.width, 120).fill('#4F46E5');
      
      // Logo placeholder area
      if (business.logo_url) {
        try {
          doc.image(business.logo_url, 50, 35, { width: 50, height: 50 });
        } catch (e) {
          // Skip if image fails
          doc.circle(75, 60, 25).fill('#FFFFFF');
        }
      } else {
        // Business initial circle
        doc.circle(75, 60, 25).fill('#FFFFFF');
        doc.fontSize(24).fillColor(primaryColor).text(
          (business.shop_name || business.name || 'S')[0].toUpperCase(),
          60, 48, { width: 30, align: 'center' }
        );
      }

      // Business Name
      doc.fontSize(22).fillColor('#FFFFFF').font('Helvetica-Bold');
      doc.text(business.shop_name || business.name || 'SmartBiz', 140, 45);
      
      // Business info
      doc.fontSize(10).font('Helvetica').fillColor('#E0E7FF');
      if (business.address) doc.text(business.address, 140, 70, { width: 250 });
      if (business.phone) doc.text(`Tel: ${business.phone}`, 140, business.address ? 85 : 70);

      // Receipt title
      doc.fontSize(10).fillColor('#FFFFFF').text('RECEIPT', doc.page.width - 100, 45);
      doc.fontSize(28).font('Helvetica-Bold').text(`#${sale.id}`, doc.page.width - 100, 60);

      // Reset after header
      doc.fillColor(textColor);
      
      // Date and Customer Info Box
      const infoY = 140;
      doc.rect(40, infoY, doc.page.width - 80, 60).fill('#F9FAFB').stroke(borderColor);
      
      doc.fontSize(10).font('Helvetica');
      doc.fillColor(lightGray).text('DATE', 60, infoY + 12);
      doc.fillColor(textColor).text(new Date(sale.created_at).toLocaleString(), 60, infoY + 25);
      
      doc.fillColor(lightGray).text('CUSTOMER', 200, infoY + 12);
      doc.fillColor(textColor).text(sale.customer || 'Walk-in Customer', 200, infoY + 25);
      
      doc.fillColor(lightGray).text('STATUS', 400, infoY + 12);
      const isPaid = parseFloat(sale.total) <= parseFloat(sale.paid || 0);
      doc.fillColor(isPaid ? '#10B981' : '#F59E0B').text(isPaid ? 'PAID' : 'PARTIAL', 400, infoY + 25);

      // Items Table Header
      const tableY = 220;
      doc.rect(40, tableY, doc.page.width - 80, 30).fill('#4F46E5');
      
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#FFFFFF');
      doc.text('ITEM', 55, tableY + 9);
      doc.text('QTY', 300, tableY + 9, { width: 60, align: 'center' });
      doc.text('PRICE', 370, tableY + 9, { width: 80, align: 'right' });
      doc.text('TOTAL', 460, tableY + 9, { width: 80, align: 'right' });

      // Items
      let itemY = tableY + 35;
      doc.fontSize(10).font('Helvetica').fillColor(textColor);
      
      const items = itemsResult.rows.length > 0 ? itemsResult.rows : [{ product_name: 'Item', quantity: 1, unit_price: sale.total, total: sale.total }];
      
      items.forEach((item, index) => {
        const bgColor = index % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
        doc.rect(40, itemY, doc.page.width - 80, 25).fill(bgColor).stroke(borderColor);
        
        doc.fillColor(textColor).text(item.product_name || 'Product', 55, itemY + 7, { width: 230 });
        doc.fillColor(lightGray).text(item.quantity.toString(), 300, itemY + 7, { width: 60, align: 'center' });
        doc.fillColor(textColor).text(`NLE ${parseFloat(item.unit_price).toFixed(2)}`, 370, itemY + 7, { width: 80, align: 'right' });
        doc.fillColor(primaryColor).font('Helvetica-Bold').text(`NLE ${parseFloat(item.total).toFixed(2)}`, 460, itemY + 7, { width: 80, align: 'right' });
        
        doc.font('Helvetica').fillColor(textColor);
        itemY += 25;
      });

      // Totals Section
      const totalsY = itemY + 20;
      doc.rect(250, totalsY, doc.page.width - 290, 80).fill('#F9FAFB').stroke(borderColor);
      
      doc.fontSize(10).fillColor(lightGray);
      doc.text('Subtotal', 270, totalsY + 12);
      doc.text(`NLE ${parseFloat(sale.total).toFixed(2)}`, 460, totalsY + 12, { width: 70, align: 'right' });
      
      doc.text('Paid', 270, totalsY + 32);
      doc.fillColor('#10B981').text(`NLE ${parseFloat(sale.paid || 0).toFixed(2)}`, 460, totalsY + 32, { width: 70, align: 'right' });
      
      doc.moveTo(265, totalsY + 45).lineTo(530, totalsY + 45).stroke(borderColor);
      
      doc.fontSize(12).font('Helvetica-Bold').fillColor(textColor);
      doc.text('Balance Due', 270, totalsY + 52);
      const balance = parseFloat(sale.total) - parseFloat(sale.paid || 0);
      doc.fillColor(balance > 0 ? '#F59E0B' : '#10B981').text(
        `NLE ${Math.abs(balance).toFixed(2)}`,
        460, totalsY + 52, { width: 70, align: 'right' }
      );

      // Footer
      const footerY = doc.page.height - 80;
      doc.moveTo(50, footerY).lineTo(doc.page.width - 50, footerY).stroke(primaryColor);
      
      doc.fontSize(10).font('Helvetica').fillColor(lightGray);
      doc.text('Thank you for your business!', 50, footerY + 15, { width: doc.page.width - 100, align: 'center' });
      doc.text('Powered by SmartBiz-SL', 50, footerY + 30, { width: doc.page.width - 100, align: 'center' });

      // QR Code placeholder
      doc.rect(doc.page.width - 100, footerY + 5, 50, 50).stroke(borderColor);
      doc.fontSize(8).fillColor(lightGray).text('Scan to verify', doc.page.width - 95, footerY + 58);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateReceiptPDF };
