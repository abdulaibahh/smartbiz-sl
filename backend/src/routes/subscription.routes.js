const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const db = require("../config/db");
const auth = require("../middlewares/auth");

// Subscription price in NLE (for validation)
const SUBSCRIPTION_PRICE = 19; // $19 USD = approx 380 NLE (adjust as needed)
const SUBSCRIPTION_DAYS = 30; // 1 month subscription

// Helper function to activate subscription
async function activateSubscription(businessId, paymentMethod, paymentId) {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + SUBSCRIPTION_DAYS);
  
  await db.query(
    `UPDATE businesses 
     SET subscription_active = true,
         subscription_start_date = $1,
         subscription_end_date = $2
     WHERE id = $3`,
    [startDate, endDate, businessId]
  );
  
  // Update payment record
  if (paymentId) {
    await db.query(
      `UPDATE subscription_payments 
       SET status = 'approved',
           subscription_activated = true,
           verified_at = NOW()
       WHERE id = $1`,
      [paymentId]
    );
  }
  
  console.log(`✅ Subscription activated for business ${businessId} until ${endDate.toISOString()}`);
  return { startDate, endDate };
}

// Helper function to check if subscription is expired
async function checkAndUpdateSubscriptionStatus(businessId) {
  try {
    console.log("Fetching subscription status for business:", businessId);
    
    const result = await db.query(
      `SELECT subscription_active, subscription_end_date, trial_end
       FROM businesses WHERE id = $1`,
      [businessId]
    );
    
    console.log("Database result rows:", result.rows.length);
    console.log("Business data:", JSON.stringify(result.rows[0]));
    
    if (!result.rows.length) return { active: false };
    
    const biz = result.rows[0];
    const now = new Date();
    let trialEnd = biz.trial_end ? new Date(biz.trial_end) : null;
    
    console.log("Current time:", now);
    console.log("Trial end:", trialEnd);
    console.log("Subscription active:", biz.subscription_active);
    console.log("Subscription end date:", biz.subscription_end_date);
    
    // If no trial_end is set, create a 30-day trial automatically
    if (!trialEnd) {
      const newTrialEnd = new Date();
      newTrialEnd.setDate(newTrialEnd.getDate() + 30);
      
      // Update the database with the new trial_end - format as ISO string
      await db.query(
        `UPDATE businesses SET trial_end = $1 WHERE id = $2`,
        [newTrialEnd.toISOString(), businessId]
      );
      console.log(`✅ Auto-created 30-day trial for business ${businessId}`);
      trialEnd = newTrialEnd;
    }
    
    const endDate = biz.subscription_end_date ? new Date(biz.subscription_end_date) : null;
    
    // Check if there's a valid trial period
    if (!biz.subscription_active && trialEnd && now <= trialEnd) {
      // Trial is still active
      const daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
      return {
        active: true, // Treat trial as active
        isTrial: true,
        endDate: trialEnd,
        daysRemaining: daysRemaining,
        expired: false
      };
    }
    
    // If subscription exists and is active, check if it's expired
    if (biz.subscription_active && endDate && now > endDate) {
      await db.query(
        `UPDATE businesses SET subscription_active = false WHERE id = $1`,
        [businessId]
      );
      return { 
        active: false, 
        expired: true, 
        endDate: endDate,
        message: "Subscription has expired"
      };
    }
    
    // If subscription is active
    if (biz.subscription_active) {
      const daysRemaining = endDate ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : 0;
      return {
        active: true,
        endDate: endDate,
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
        expired: daysRemaining <= 0
      };
    }
    
    // No subscription and no trial (or trial expired)
    return {
      active: false,
      isTrial: false,
      endDate: trialEnd,
      daysRemaining: 0,
      expired: true
    };
  } catch (err) {
    console.error("Error in checkAndUpdateSubscriptionStatus:", err);
    throw err;
  }
}

// Get subscription status
router.get("/status", auth, async (req, res) => {
  try {
    console.log("=== Subscription Status Debug ===");
    console.log("User ID:", req.user.id);
    console.log("Business ID:", req.user.business_id);
    
    const status = await checkAndUpdateSubscriptionStatus(req.user.business_id);
    
    console.log("Status returned:", JSON.stringify(status));
    console.log("=================================");
    
    res.json({
      active: status.active,
      expired: status.expired || false,
      daysRemaining: status.daysRemaining || 0,
      endDate: status.endDate,
      isTrial: status.isTrial || false,
      message: status.message || null
    });
  } catch (err) {
    console.error("Subscription status error:", err);
    res.status(500).json({ message: "Failed to fetch subscription status" });
  }
});

// Create checkout session
router.post("/checkout", auth, async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.json({ url: null, error: "Stripe not configured" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "SmartBiz Pro",
              description: "1 month subscription - Auto-renews monthly"
            },
            unit_amount: 1900, // $19.00
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/subscription?cancel=true`,
      client_reference_id: req.user.business_id,
      metadata: {
        business_id: req.user.business_id
      }
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).json({ message: "Checkout failed", error: err.message });
  }
});

/* ================= ORANGE MONEY PAYMENT ================= */

// Submit Orange Money payment request with auto-verification
router.post("/orange-payment", express.json(), auth, async (req, res) => {
  try {
    // Validate request body exists
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ message: "Invalid request body" });
    }
    
    const { transactionId, senderNumber, amount } = req.body;

    if (!transactionId || !senderNumber || !amount) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate transaction ID format (Orange Money transaction IDs are typically 10-15 digits)
    const transactionIdRegex = /^\d{10,15}$/;
    if (!transactionIdRegex.test(transactionId)) {
      return res.status(400).json({ 
        message: "Invalid transaction ID format",
        details: "Transaction ID should be 10-15 digits"
      });
    }

    // Validate phone number format (Sierra Leone: +232 XX XXX XXXX or 0XX XXX XXXX)
    const phoneRegex = /^(\+232|0)[\d\s]{8,9}$/;
    const cleanPhone = senderNumber.replace(/\s/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({ 
        message: "Invalid phone number format",
        details: "Please use format: +232 XX XXX XXXX or 0XX XXX XXXX"
      });
    }

    // Validate amount (must be at least the subscription price)
    const minAmount = SUBSCRIPTION_PRICE;
    if (parseFloat(amount) < minAmount) {
      return res.status(400).json({ 
        message: "Insufficient payment amount",
        details: `Minimum payment required: NLE ${minAmount}. You sent: NLE ${amount}`
      });
    }

    // Check if transaction ID was already used
    const existingPayment = await db.query(
      `SELECT id, status FROM subscription_payments WHERE transaction_id = $1`,
      [transactionId]
    );
    
    if (existingPayment.rows.length > 0) {
      const existing = existingPayment.rows[0];
      if (existing.status === 'approved') {
        return res.status(400).json({ 
          message: "Transaction ID already used",
          details: "This transaction has already been processed for a subscription"
        });
      }
    }

    // Store the payment request
    const paymentResult = await db.query(
      `INSERT INTO subscription_payments 
       (business_id, payment_method, transaction_id, sender_number, amount, status, verification_notes) 
       VALUES ($1, 'orange_money', $2, $3, $4, 'pending', 'Auto-verification in progress')
       ON CONFLICT (transaction_id) DO UPDATE SET
         business_id = $1,
         sender_number = $3,
         amount = $4,
         status = 'pending'
       RETURNING id`,
      [req.user.business_id, transactionId, cleanPhone, amount]
    );

    const paymentId = paymentResult.rows[0].id;

    // AUTO-VERIFICATION LOGIC
    // In production, you would integrate with Orange Money API to verify
    // For now, we simulate verification with validation rules
    
    let verificationResult = {
      verified: false,
      reason: null
    };

    // Simulate API verification delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verification checks
    const checks = {
      validTransactionId: transactionIdRegex.test(transactionId),
      validPhone: phoneRegex.test(cleanPhone),
      sufficientAmount: parseFloat(amount) >= minAmount,
      notDuplicate: existingPayment.rows.length === 0 || existingPayment.rows[0].status !== 'approved'
    };

    // If all checks pass, auto-approve
    if (checks.validTransactionId && checks.validPhone && checks.sufficientAmount && checks.notDuplicate) {
      verificationResult.verified = true;
      
      // Activate subscription
      const subscription = await activateSubscription(req.user.business_id, 'orange_money', paymentId);
      
      return res.json({ 
        success: true,
        message: "Payment verified and subscription activated!",
        subscription: {
          active: true,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          daysRemaining: SUBSCRIPTION_DAYS
        },
        payment: {
          id: paymentId,
          transactionId: transactionId,
          amount: amount,
          status: 'approved'
        }
      });
    } else {
      // Payment failed verification
      let failureReason = [];
      if (!checks.validTransactionId) failureReason.push("Invalid transaction ID");
      if (!checks.validPhone) failureReason.push("Invalid phone number");
      if (!checks.sufficientAmount) failureReason.push("Insufficient amount");
      if (!checks.notDuplicate) failureReason.push("Duplicate transaction");
      
      verificationResult.reason = failureReason.join(", ");
      
      // Update payment status to rejected
      await db.query(
        `UPDATE subscription_payments 
         SET status = 'rejected',
             verification_notes = $1,
             verified_at = NOW()
         WHERE id = $2`,
        [verificationResult.reason, paymentId]
      );
      
      return res.status(400).json({ 
        success: false,
        message: "Payment verification failed",
        details: verificationResult.reason,
        checks: checks
      });
    }
    
  } catch (err) {
    console.error("Orange payment error:", err);
    res.status(500).json({ message: "Failed to process payment", error: err.message });
  }
});

// Manual verification endpoint (for admin override)
router.post("/verify-orange-payment", express.json(), auth, async (req, res) => {
  try {
    // Validate request body exists
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ message: "Invalid request body" });
    }
    
    // Check if user is admin
    const userCheck = await db.query(
      "SELECT role FROM users WHERE id = $1",
      [req.user.id]
    );

    if (userCheck.rows[0]?.role !== "owner" && userCheck.rows[0]?.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { paymentId, approved, notes } = req.body;

    if (!paymentId) {
      return res.status(400).json({ message: "Payment ID is required" });
    }

    // Get payment details
    const paymentResult = await db.query(
      `SELECT * FROM subscription_payments WHERE id = $1`,
      [paymentId]
    );
    
    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ message: "Payment not found" });
    }
    
    const payment = paymentResult.rows[0];

    if (approved) {
      // Activate subscription
      const subscription = await activateSubscription(payment.business_id, 'orange_money', paymentId);
      
      await db.query(
        `UPDATE subscription_payments 
         SET status = 'approved',
             verification_notes = $1,
             verified_by = $2,
             verified_at = NOW(),
             subscription_activated = true
         WHERE id = $3`,
        [notes || 'Manually approved by admin', req.user.id, paymentId]
      );
      
      res.json({ 
        success: true,
        message: "Payment manually approved and subscription activated",
        subscription: {
          active: true,
          endDate: subscription.endDate,
          daysRemaining: SUBSCRIPTION_DAYS
        }
      });
    } else {
      await db.query(
        `UPDATE subscription_payments 
         SET status = 'rejected',
             verification_notes = $1,
             verified_by = $2,
             verified_at = NOW()
         WHERE id = $3`,
        [notes || 'Manually rejected by admin', req.user.id, paymentId]
      );
      
      res.json({ 
        success: true,
        message: "Payment rejected",
        details: notes || 'No reason provided'
      });
    }
  } catch (err) {
    console.error("Verification error:", err);
    res.status(500).json({ message: "Verification failed", error: err.message });
  }
});

// Get payment history
router.get("/payments", auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, payment_method, transaction_id, amount, status, 
              verification_notes, created_at, verified_at
       FROM subscription_payments 
       WHERE business_id = $1
       ORDER BY created_at DESC`,
      [req.user.business_id]
    );
    
    res.json({ payments: result.rows });
  } catch (err) {
    console.error("Payment history error:", err.message);
    // Return empty array if table doesn't exist
    res.json({ payments: [] });
  }
});

// Stripe webhook
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("❌ Signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      await db.query("BEGIN");

      const existing = await db.query(
        "SELECT id FROM stripe_events WHERE event_id=$1",
        [event.id]
      );

      if (existing.rows.length > 0) {
        await db.query("ROLLBACK");
        return res.json({ received: true });
      }

      await db.query(
        "INSERT INTO stripe_events(event_id) VALUES($1)",
        [event.id]
      );

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          const businessId = session.client_reference_id || session.metadata?.business_id;

          if (businessId && session.payment_status === 'paid') {
            // Verify payment was successful
            const subscription = await activateSubscription(businessId, 'stripe_card', null);
            
            // Store stripe customer ID for future reference
            if (session.customer) {
              await db.query(
                `UPDATE businesses SET stripe_customer_id = $1 WHERE id = $2`,
                [session.customer, businessId]
              );
            }
            
            console.log("✅ Stripe subscription activated for business:", businessId);
          }
          break;
        }

        case "invoice.payment_succeeded": {
          const customerId = event.data.object.customer;
          
          // Find business by stripe customer ID and extend subscription
          const businessResult = await db.query(
            `SELECT id FROM businesses WHERE stripe_customer_id = $1`,
            [customerId]
          );
          
          if (businessResult.rows.length > 0) {
            const businessId = businessResult.rows[0].id;
            const subscription = await activateSubscription(businessId, 'stripe_recurring', null);
            console.log("💰 Stripe recurring payment succeeded, subscription extended for:", businessId);
          }
          break;
        }

        case "invoice.payment_failed": {
          const customerId = event.data.object.customer;
          await db.query(
            `UPDATE businesses 
             SET subscription_active = false 
             WHERE stripe_customer_id = $1`,
            [customerId]
          );
          console.log("⚠️ Subscription payment failed for customer:", customerId);
          break;
        }

        case "customer.subscription.deleted": {
          const customerId = event.data.object.customer;
          await db.query(
            `UPDATE businesses 
             SET subscription_active = false,
                 subscription_end_date = NOW()
             WHERE stripe_customer_id = $1`,
            [customerId]
          );
          console.log("❌ Subscription cancelled for customer:", customerId);
          break;
        }

        default:
          console.log("Unhandled Stripe event:", event.type);
      }

      await db.query("COMMIT");
      res.json({ received: true });

    } catch (err) {
      await db.query("ROLLBACK");
      console.error("Webhook processing error:", err);
      res.status(500).send("Server error");
    }
  }
);

module.exports = router;
