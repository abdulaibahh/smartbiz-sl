const PDFDocument = require("pdfkit");
const path = require("path");
const db = require("../config/db");

// Generate professional receipt PDF
async function generateReceiptPDF(saleId, businessId) {
  // Get sale details including receipt_number
  const saleResult = await db.query(
    "SELECT *, COALESCE(receipt_number, id) as display_receipt_number FROM sales WHERE id = $1 AND business_id = $2",
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
      const doc = new PDFDocument({ margin: 40, size: 'A4' });

      doc.on("data", chunk => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Colors
      const primaryColor = '#1E40AF';
      const secondaryColor = '#3B82F6';
      const textColor = '#1F2937';
      const lightGray = '#6B7280';
      const borderColor = '#E5E7EB';
      const bgLight = '#F9FAFB';

      // Page width for calculations
      const pageWidth = doc.page.width;
      const contentWidth = pageWidth - 80;

      // ========== HEADER SECTION ==========
      const headerY = 40;
      
      // Top border line
      doc.moveTo(40, headerY).lineTo(pageWidth - 40, headerY).lineWidth(3).stroke(primaryColor);

      // Business Logo/Initial
      const logoSize = 50;
      const logoX = 50;
      const logoY = headerY + 15;
      
      if (business.logo_url) {
        try {
          // Convert relative path to absolute path for PDFKit
          let logoPath = business.logo_url;
          if (logoPath.startsWith('/uploads/')) {
            logoPath = path.join(__dirname, '../../', logoPath);
          }
          doc.image(logoPath, logoX, logoY, { width: logoSize, height: logoSize });
        } catch (e) {
          // Fallback to circle with initial
          doc.circle(logoX + logoSize/2, logoY + logoSize/2, logoSize/2).fill(primaryColor);
          doc.fontSize(20).fillColor('#FFFFFF').font('Helvetica-Bold');
          doc.text(
            (business.shop_name || business.name || 'S')[0].toUpperCase(),
            logoX, logoY + 15, { width: logoSize, align: 'center' }
          );
        }
      } else {
        // Business initial circle
        doc.circle(logoX + logoSize/2, logoY + logoSize/2, logoSize/2).fill(primaryColor);
        doc.fontSize(20).fillColor('#FFFFFF').font('Helvetica-Bold');
        doc.text(
          (business.shop_name || business.name || 'S')[0].toUpperCase(),
          logoX, logoY + 15, { width: logoSize, align: 'center' }
        );
      }

      // Business Details - Centered
      const businessX = 120;
      const businessY = headerY + 15;
      
      doc.fontSize(20).fillColor(primaryColor).font('Helvetica-Bold');
      doc.text(business.shop_name || business.name || 'SmartBiz', businessX, businessY);
      
      doc.fontSize(9).fillColor(lightGray).font('Helvetica');
      let detailY = businessY + 25;
      
      if (business.address) {
        doc.text(business.address, businessX, detailY);
        detailY += 14;
      }
      if (business.phone) {
        doc.text(`Phone: ${business.phone}`, businessX, detailY);
        detailY += 14;
      }
      if (business.email) {
        doc.text(`Email: ${business.email}`, businessX, detailY);
      }

      // Receipt Info Box - Right Side
      const infoBoxX = pageWidth - 200;
      const infoBoxY = headerY + 15;
      const infoBoxWidth = 160;
      const infoBoxHeight = 70;
      
      doc.rect(infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight).fill(bgLight).stroke(borderColor);
      
      doc.fontSize(9).fillColor(lightGray).font('Helvetica');
      doc.text('RECEIPT NO', infoBoxX + 10, infoBoxY + 10);
      doc.fontSize(14).fillColor(primaryColor).font('Helvetica-Bold');
      doc.text(`#${String(sale.display_receipt_number).padStart(6, '0')}`, infoBoxX + 10, infoBoxY + 22);
      
      doc.fontSize(9).fillColor(lightGray).font('Helvetica');
      doc.text('DATE', infoBoxX + 10, infoBoxY + 42);
      doc.fontSize(10).fillColor(textColor).font('Helvetica-Bold');
      doc.text(new Date(sale.created_at).toLocaleDateString('en-GB'), infoBoxX + 10, infoBoxY + 54);

      // ========== CUSTOMER & SALE INFO ==========
      const customerY = headerY + 100;
      
      // Two column layout
      const col1X = 40;
      const col2X = pageWidth / 2;
      
      // Left Column - Bill To
      doc.fontSize(10).fillColor(lightGray).font('Helvetica');
      doc.text('BILL TO', col1X, customerY);
      doc.moveTo(col1X, customerY + 12).lineTo(col1X + 80, customerY + 12).lineWidth(1).stroke(secondaryColor);
      
      doc.fontSize(11).fillColor(textColor).font('Helvetica-Bold');
      doc.text(sale.customer || 'Walk-in Customer', col1X, customerY + 18);
      
      // Right Column - Sale Details
      doc.fontSize(10).fillColor(lightGray).font('Helvetica');
      doc.text('SALE DETAILS', col2X, customerY);
      doc.moveTo(col2X, customerY + 12).lineTo(col2X + 80, customerY + 12).lineWidth(1).stroke(secondaryColor);
      
      const isPaid = parseFloat(sale.total) <= parseFloat(sale.paid || 0);
      const statusColor = isPaid ? '#059669' : '#D97706';
      const statusText = isPaid ? 'PAID' : 'PARTIAL PAYMENT';
      
      doc.fontSize(10).fillColor(textColor).font('Helvetica');
      doc.text(`Status: `, col2X, customerY + 18);
      doc.fillColor(statusColor).font('Helvetica-Bold');
      doc.text(statusText, col2X + 35, customerY + 18);
      
      doc.fillColor(textColor).font('Helvetica');
      doc.text(`Time: ${new Date(sale.created_at).toLocaleTimeString()}`, col2X, customerY + 32);

      // ========== ITEMS TABLE ==========
      const tableY = customerY + 70;
      const colWidths = {
        item: contentWidth * 0.45,
        qty: contentWidth * 0.15,
        price: contentWidth * 0.20,
        total: contentWidth * 0.20
      };
      
      const colX = {
        item: 40,
        qty: 40 + colWidths.item,
        price: 40 + colWidths.item + colWidths.qty,
        total: 40 + colWidths.item + colWidths.qty + colWidths.price
      };

      // Table Header
      doc.rect(40, tableY, contentWidth, 32).fill(primaryColor);
      
      doc.fontSize(10).fillColor('#FFFFFF').font('Helvetica-Bold');
      doc.text('DESCRIPTION', colX.item + 8, tableY + 10);
      doc.text('QTY', colX.qty + 8, tableY + 10, { width: colWidths.qty - 16, align: 'center' });
      doc.text('UNIT PRICE', colX.price + 8, tableY + 10, { width: colWidths.price - 16, align: 'right' });
      doc.text('AMOUNT', colX.total + 8, tableY + 10, { width: colWidths.total - 16, align: 'right' });

      // Table Rows
      let rowY = tableY + 32;
      const rowHeight = 28;
      
      const items = itemsResult.rows.length > 0 ? itemsResult.rows : [{ 
        product_name: 'Sale Item', 
        quantity: 1, 
        unit_price: sale.total, 
        total: sale.total 
      }];
      
      items.forEach((item, index) => {
        const isEven = index % 2 === 0;
        const bgColor = isEven ? '#FFFFFF' : bgLight;
        
        // Row background
        doc.rect(40, rowY, contentWidth, rowHeight).fill(bgColor).stroke(borderColor);
        
        // Item name
        doc.fontSize(10).fillColor(textColor).font('Helvetica');
        doc.text(item.product_name || 'Product', colX.item + 8, rowY + 8, { 
          width: colWidths.item - 16,
          ellipsis: true
        });
        
        // Quantity
        doc.fillColor(lightGray).font('Helvetica');
        doc.text(item.quantity.toString(), colX.qty + 8, rowY + 8, { 
          width: colWidths.qty - 16, 
          align: 'center' 
        });
        
        // Unit Price
        doc.fillColor(textColor).font('Helvetica');
        doc.text(
          `NLE ${parseFloat(item.unit_price).toFixed(2)}`, 
          colX.price + 8, 
          rowY + 8, 
          { width: colWidths.price - 16, align: 'right' }
        );
        
        // Total
        doc.fillColor(primaryColor).font('Helvetica-Bold');
        doc.text(
          `NLE ${parseFloat(item.total).toFixed(2)}`, 
          colX.total + 8, 
          rowY + 8, 
          { width: colWidths.total - 16, align: 'right' }
        );
        
        rowY += rowHeight;
      });

      // Table bottom border
      doc.moveTo(40, rowY).lineTo(pageWidth - 40, rowY).lineWidth(2).stroke(primaryColor);

      // ========== TOTALS SECTION ==========
      const totalsY = rowY + 20;
      const totalsWidth = 240;
      const totalsX = pageWidth - 40 - totalsWidth;

      // Subtotal
      doc.fontSize(10).fillColor(lightGray).font('Helvetica');
      doc.text('Subtotal', totalsX, totalsY);
      doc.fillColor(textColor).font('Helvetica');
      doc.text(
        `NLE ${parseFloat(sale.total).toFixed(2)}`, 
        totalsX + 100, 
        totalsY, 
        { width: 140, align: 'right' }
      );

      // Paid Amount
      const paidY = totalsY + 20;
      doc.fillColor(lightGray).font('Helvetica');
      doc.text('Amount Paid', totalsX, paidY);
      doc.fillColor('#059669').font('Helvetica-Bold');
      doc.text(
        `NLE ${parseFloat(sale.paid || 0).toFixed(2)}`, 
        totalsX + 100, 
        paidY, 
        { width: 140, align: 'right' }
      );

      // Divider line
      doc.moveTo(totalsX, paidY + 15).lineTo(totalsX + totalsWidth, paidY + 15).lineWidth(1).stroke(borderColor);

      // Balance Due
      const balanceY = paidY + 25;
      const balance = parseFloat(sale.total) - parseFloat(sale.paid || 0);
      const balanceColor = balance > 0 ? '#D97706' : '#059669';
      const balanceLabel = balance > 0 ? 'Balance Due' : 'Change';

      doc.fontSize(12).fillColor(textColor).font('Helvetica-Bold');
      doc.text(balanceLabel, totalsX, balanceY);
      doc.fillColor(balanceColor).font('Helvetica-Bold');
      doc.text(
        `NLE ${Math.abs(balance).toFixed(2)}`, 
        totalsX + 100, 
        balanceY, 
        { width: 140, align: 'right' }
      );

      // ========== FOOTER ==========
      const footerY = doc.page.height - 100;
      
      // Top border
      doc.moveTo(40, footerY).lineTo(pageWidth - 40, footerY).lineWidth(1).stroke(borderColor);
      
      // Thank you message
      doc.fontSize(11).fillColor(primaryColor).font('Helvetica-Bold');
      doc.text('Thank you for your business!', 40, footerY + 15, { 
        width: contentWidth, 
        align: 'center' 
      });
      
      // Terms
      doc.fontSize(9).fillColor(lightGray).font('Helvetica');
      doc.text(
        'Goods sold are not returnable. Please keep this receipt for your records.',
        40, 
        footerY + 35, 
        { width: contentWidth, align: 'center' }
      );
      
      // Powered by
      doc.fontSize(8).fillColor(lightGray).font('Helvetica');
      doc.text(
        'Powered by SmartBiz-SL | smartbizsl.vercel.app',
        40, 
        footerY + 55, 
        { width: contentWidth, align: 'center' }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateReceiptPDF };
