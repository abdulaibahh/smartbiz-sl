const router = require("express").Router();
const db = require("../config/db");
const auth = require("../middlewares/auth");

// Lazy load OpenAI to avoid startup errors
let openai = null;
const getOpenAI = () => {
  if (!openai && process.env.OPENAI_KEY) {
    const OpenAI = require("openai");
    openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });
  }
  return openai;
};

/* ================= AI BUSINESS SUMMARY ================= */

router.get("/summary", auth, async (req, res) => {
  try {
    const { period = "week" } = req.query;
    let dateFilter;
    const now = new Date();
    
    switch (period) {
      case "day":
        dateFilter = now.toISOString().split('T')[0];
        break;
      case "month":
        now.setMonth(now.getMonth() - 1);
        dateFilter = now.toISOString();
        break;
      case "week":
      default:
        now.setDate(now.getDate() - 7);
        dateFilter = now.toISOString();
    }

    // Get sales data
    const salesResult = await db.query(
      `SELECT 
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(SUM(paid), 0) as total_paid,
        COUNT(*) as transaction_count,
        COALESCE(AVG(total), 0) as avg_transaction
       FROM sales 
       WHERE business_id = $1 AND created_at >= $2`,
      [req.user.business_id, dateFilter]
    );

    // Get previous period for comparison
    const prevDate = new Date(dateFilter);
    const currentStart = new Date(dateFilter);
    prevDate.setDate(prevDate.getDate() - (period === "day" ? 1 : period === "week" ? 7 : 30));
    
    const prevSalesResult = await db.query(
      `SELECT COALESCE(SUM(total), 0) as total_revenue
       FROM sales 
       WHERE business_id = $1 AND created_at >= $2 AND created_at < $3`,
      [req.user.business_id, prevDate.toISOString(), currentStart.toISOString()]
    );

    // Get top products (from sales with items if available, else customer aggregation)
    const topCustomersResult = await db.query(
      `SELECT customer, SUM(total) as total_spent, COUNT(*) as visits
       FROM sales 
       WHERE business_id = $1 AND created_at >= $2
       GROUP BY customer
       ORDER BY total_spent DESC
       LIMIT 5`,
      [req.user.business_id, dateFilter]
    );

    // Get debt status
    const debtResult = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total_debt, COUNT(*) as debt_count
       FROM debts 
       WHERE business_id = $1`,
      [req.user.business_id]
    );

    // Get inventory status
    const inventoryResult = await db.query(
      `SELECT 
        COUNT(*) as total_items,
        COALESCE(SUM(quantity), 0) as total_stock
       FROM inventory 
       WHERE business_id = $1`,
      [req.user.business_id]
    );

    // Calculate change percentage
    const currentRevenue = parseFloat(salesResult.rows[0].total_revenue) || 0;
    const prevRevenue = parseFloat(prevSalesResult.rows[0].total_revenue) || 0;
    const revenueChange = prevRevenue > 0 
      ? ((currentRevenue - prevRevenue) / prevRevenue * 100).toFixed(1)
      : 0;

    const summary = {
      period,
      revenue: {
        total: currentRevenue,
        paid: parseFloat(salesResult.rows[0].total_paid),
        change: revenueChange,
        isPositive: parseFloat(revenueChange) >= 0
      },
      transactions: {
        count: salesResult.rows[0].transaction_count,
        avgValue: parseFloat(salesResult.rows[0].avg_transaction) || 0
      },
      topCustomers: topCustomersResult.rows,
      debts: {
        total: parseFloat(debtResult.rows[0].total_debt) || 0,
        count: debtResult.rows[0].debt_count
      },
      inventory: {
        items: inventoryResult.rows[0].total_items,
        stock: parseFloat(inventoryResult.rows[0].total_stock) || 0
      }
    };

    // Try to get AI-enhanced summary
    const openaiInstance = getOpenAI();
    
    if (openaiInstance) {
      const aiPrompt = `
Based on this business data for the past ${period}:
- Revenue: NLE ${currentRevenue} (${revenueChange}% change from previous period)
- Transactions: ${salesResult.rows[0].transaction_count}
- Average Transaction: NLE ${parseFloat(salesResult.rows[0].avg_transaction).toFixed(2)}
- Total Debts: NLE ${debtResult.rows[0].total_debt}
- Inventory Items: ${inventoryResult.rows[0].total_items}

Write a concise 2-3 paragraph business summary in plain English. Mention:
1. Revenue performance and trend
2. Key insights or recommendations
3. Any concerns to address

Keep it conversational and business-friendly.
`;
      try {
        const completion = await openaiInstance.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: aiPrompt }],
          max_tokens: 300
        });
        summary.aiSummary = completion.choices[0].message.content;
      } catch (e) {
        // Fall back to basic summary
        summary.aiSummary = generateBasicSummary(summary);
      }
    } else {
      summary.aiSummary = generateBasicSummary(summary);
    }

    res.json(summary);
  } catch (err) {
    console.error("AI summary error:", err);
    res.status(500).json({ message: "Failed to generate summary" });
  }
});

// Helper function for basic summary without AI
function generateBasicSummary(data) {
  const { revenue, transactions, debts } = data;
  let summary = "";
  
  summary += `📊 This ${data.period}, your business made NLE ${revenue.total.toLocaleString()} in revenue.`;
  
  if (revenue.change != 0) {
    summary += ` That's ${Math.abs(revenue.change)}% ${revenue.isPositive ? 'more' : 'less'} than the previous ${data.period}.`;
  }
  
  summary += ` You had ${transactions.count} transactions, averaging NLE ${transactions.avgValue.toFixed(0)} per sale.`;
  
  if (debts.total > 0) {
    summary += ` ⚠️ You have NLE ${debts.total.toLocaleString()} in outstanding debts.`;
  }
  
  return summary;
}

/* ================= AI INSIGHTS ================= */

router.get("/insights", auth, async (req, res) => {
  try {
    const { type = "all" } = req.query;
    
    const insights = [];

    // Low stock alerts
    if (type === "all" || type === "low-stock") {
      const lowStock = await db.query(
        `SELECT product, quantity FROM inventory 
         WHERE business_id = $1 AND quantity < 10 
         ORDER BY quantity ASC LIMIT 5`,
        [req.user.business_id]
      );
      
      if (lowStock.rows.length > 0) {
        insights.push({
          type: "low-stock",
          severity: "warning",
          title: "Low Stock Alert",
          message: `${lowStock.rows.length} products may run out soon. Consider restocking.`,
          items: lowStock.rows
        });
      }
    }

    // Slow-moving products
    if (type === "all" || type === "slow-moving") {
      // Get products that haven't been sold recently
      const noSales = await db.query(
        `SELECT product FROM inventory 
         WHERE business_id = $1 
         AND id NOT IN (
           SELECT DISTINCT product_id FROM sales_items 
           WHERE created_at >= NOW() - INTERVAL '30 days'
         )
         LIMIT 5`,
        [req.user.business_id]
      );
      
      // For now, just check inventory with zero quantity or very old
      const slowMovers = await db.query(
        `SELECT product, quantity FROM inventory 
         WHERE business_id = $1 AND quantity > 20
         ORDER BY quantity DESC LIMIT 5`,
        [req.user.business_id]
      );
      
      if (slowMovers.rows.length > 0) {
        insights.push({
          type: "slow-moving",
          severity: "info",
          title: "Slow-Moving Items",
          message: "These products have high stock but may not be selling quickly.",
          items: slowMovers.rows
        });
      }
    }

    // Best selling day
    if (type === "all" || type === "best-day") {
      const bestDay = await db.query(
        `SELECT TO_CHAR(created_at, 'Day') as day, 
                COUNT(*) as sales_count, 
                SUM(total) as revenue
         FROM sales 
         WHERE business_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
         GROUP BY TO_CHAR(created_at, 'Day')
         ORDER BY revenue DESC
         LIMIT 1`,
        [req.user.business_id]
      );
      
      if (bestDay.rows.length > 0) {
        insights.push({
          type: "best-day",
          severity: "success",
          title: "Best Sales Day",
          message: `${bestDay.rows[0].day.trim()} is your best day with NLE ${parseFloat(bestDay.rows[0].revenue).toLocaleString()} in revenue.`,
          data: bestDay.rows[0]
        });
      }
    }

    // Debt analysis
    if (type === "all" || type === "debt") {
      const oldDebts = await db.query(
        `SELECT customer, amount, created_at FROM debts 
         WHERE business_id = $1 AND created_at < NOW() - INTERVAL '30 days'
         ORDER BY created_at ASC LIMIT 5`,
        [req.user.business_id]
      );
      
      if (oldDebts.rows.length > 0) {
        insights.push({
          type: "debt",
          severity: "warning",
          title: "Old Outstanding Debts",
          message: `${oldDebts.rows.length} debts are over 30 days old. Consider following up.`,
          items: oldDebts.rows
        });
      }
    }

    // Try AI enhancement
    const openaiInstance = getOpenAI();
    if (openaiInstance && insights.length > 0) {
      try {
        const aiPrompt = `
You are a business analyst. Look at these insights:
${JSON.stringify(insights, null, 2)}

Provide 2-3 actionable recommendations for the business owner.
Keep it brief and practical.
`;
        const completion = await openaiInstance.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: aiPrompt }],
          max_tokens: 200
        });
        return res.json({ insights, aiRecommendations: completion.choices[0].message.content });
      } catch (e) {
        // Continue without AI
      }
    }

    res.json({ insights });
  } catch (err) {
    console.error("AI insights error:", err);
    res.status(500).json({ message: "Failed to generate insights" });
  }
});

/* ================= ASK AI (Enhanced) ================= */

router.get("/ask", auth, async (req, res) => {
  try {
    const { question } = req.query;

    if (!question) {
      return res.status(400).json({ answer: "Please ask a question" });
    }

    const business_id = req.user.business_id;

    // Get comprehensive business data
    const [
      salesData,
      debtData,
      inventoryData,
      recentSales
    ] = await Promise.all([
      db.query(
        `SELECT 
          COALESCE(SUM(total), 0) as total_revenue,
          COALESCE(SUM(paid), 0) as total_paid,
          COUNT(*) as transaction_count,
          MAX(created_at) as last_sale
         FROM sales WHERE business_id=$1`,
        [business_id]
      ),
      db.query(
        `SELECT COALESCE(SUM(amount), 0) as total_debt FROM debts WHERE business_id=$1`,
        [business_id]
      ),
      db.query(
        `SELECT COUNT(*) as items, COALESCE(SUM(quantity), 0) as total_stock FROM inventory WHERE business_id=$1`,
        [business_id]
      ),
      db.query(
        `SELECT * FROM sales WHERE business_id=$1 ORDER BY created_at DESC LIMIT 50`,
        [business_id]
      )
    ]);

    const sales = salesData.rows[0];
    const debts = debtData.rows[0];
    const inventory = inventoryData.rows[0];

    // Analyze the question type and provide data-driven answer
    const questionLower = question.toLowerCase();
    let dataAnswer = "";

    // Revenue questions
    if (questionLower.includes("revenue") || questionLower.includes("sales") || questionLower.includes("money")) {
      dataAnswer += `💰 Total Revenue: NLE ${parseFloat(sales.total_revenue).toLocaleString()}\n`;
      dataAnswer += `📊 Total Transactions: ${sales.transaction_count}\n`;
      if (sales.transaction_count > 0) {
        dataAnswer += `📈 Average Sale: NLE ${(parseFloat(sales.total_revenue) / sales.transaction_count).toFixed(0)}\n`;
      }
    }

    // Debt questions
    if (questionLower.includes("debt") || questionLower.includes("credit") || questionLower.includes("unpaid")) {
      dataAnswer += `⚠️ Total Outstanding Debt: NLE ${parseFloat(debts.total_debt).toLocaleString()}\n`;
    }

    // Inventory questions
    if (questionLower.includes("inventory") || questionLower.includes("stock") || questionLower.includes("product")) {
      dataAnswer += `📦 Total Products: ${inventory.items}\n`;
      dataAnswer += `📋 Total Stock: ${inventory.total_stock} units\n`;
    }

    // Top products/customers analysis
    if (questionLower.includes("top") || questionLower.includes("best") || questionLower.includes("popular")) {
      const customerStats = {};
      recentSales.rows.forEach(sale => {
        const cust = sale.customer || "Walk-in";
        if (!customerStats[cust]) {
          customerStats[cust] = { total: 0, count: 0 };
        }
        customerStats[cust].total += parseFloat(sale.total);
        customerStats[cust].count += 1;
      });
      
      const topCustomers = Object.entries(customerStats)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 5);
      
      if (topCustomers.length > 0) {
        dataAnswer += `\n🏆 Top Customers:\n`;
        topCustomers.forEach(([name, stats], i) => {
          dataAnswer += `${i + 1}. ${name}: NLE ${stats.total.toLocaleString()} (${stats.count} visits)\n`;
        });
      }
    }

    // Check if OpenAI is configured for enhanced response
    const openaiInstance = getOpenAI();
    
    if (!openaiInstance) {
      // Return data-driven response without AI
      const fallbackAnswer = dataAnswer || `I don't have specific data for "${question}". Try asking about:\n- Revenue or sales\n- Debts or credits\n- Inventory or stock\n- Top customers or products`;
      
      return res.json({
        answer: fallbackAnswer + "\n\n💡 Configure OPENAI_KEY in backend .env for AI-powered insights."
      });
    }

    // Use AI for enhanced response
    const prompt = `
You are a helpful business assistant. The user is asking about their business.

Business Data:
- Revenue: NLE ${parseFloat(sales.total_revenue).toLocaleString()}
- Transactions: ${sales.transaction_count}
- Outstanding Debts: NLE ${parseFloat(debts.total_debt).toLocaleString()}
- Inventory: ${inventory.items} products, ${inventory.total_stock} total units
- Last Sale: ${sales.last_sale || "No sales yet"}

User Question: ${question}

Instructions:
1. First provide relevant data from above
2. Then give actionable insights or recommendations
3. Keep it conversational and helpful
4. Don't make up data that isn't provided
`;

    const completion = await openaiInstance.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500
    });

    res.json({ answer: completion.choices[0].message.content });
  } catch (err) {
    console.error("AI ask error:", err);
    
    // Return a more helpful error message
    const business_id = req.user.business_id;
    
    // Try to get basic data for fallback response
    try {
      const [salesData, debtData, inventoryData] = await Promise.all([
        db.query(`SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count FROM sales WHERE business_id=$1`, [business_id]),
        db.query(`SELECT COALESCE(SUM(amount), 0) as total FROM debts WHERE business_id=$1`, [business_id]),
        db.query(`SELECT COUNT(*) as items, COALESCE(SUM(quantity), 0) as stock FROM inventory WHERE business_id=$1`, [business_id])
      ]);
      
      const fallbackAnswer = `I apologize, but I'm having trouble processing your request right now due to a technical issue.\n\nHowever, here's your business summary:\n- Revenue: NLE ${parseFloat(salesData.rows[0].total).toLocaleString()}\n- Transactions: ${salesData.rows[0].count}\n- Outstanding Debts: NLE ${parseFloat(debtData.rows[0].total).toLocaleString()}\n- Inventory: ${inventoryData.rows[0].items} products (${inventoryData.rows[0].stock} units)\n\nPlease try again in a few moments.`;
      
      return res.json({ answer: fallbackAnswer });
    } catch (fallbackErr) {
      return res.json({ 
        answer: "I apologize, but I encountered an error while processing your request. Please try again later." 
      });
    }
  }
});

module.exports = router;
