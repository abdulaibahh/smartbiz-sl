const db = require("../config/db");

module.exports = async (req, res, next) => {
  try {
    const result = await db.query(
      "SELECT trial_end, subscription_active FROM businesses WHERE id=$1",
      [req.user.business_id]
    );

    // If no business found, allow for now
    if (!result.rows.length) {
      return next();
    }

    const biz = result.rows[0];
    const now = new Date();
    let trialEnd = biz.trial_end ? new Date(biz.trial_end) : null;

    // If no trial_end is set, create a 30-day trial automatically
    if (!trialEnd) {
      const newTrialEnd = new Date();
      newTrialEnd.setDate(newTrialEnd.getDate() + 30);
      
      await db.query(
        "UPDATE businesses SET trial_end = $1 WHERE id = $2",
        [newTrialEnd, req.user.business_id]
      );
      console.log(`✅ Auto-created 30-day trial for business ${req.user.business_id}`);
      trialEnd = newTrialEnd;
    }

    // Allow if subscription is active
    if (biz.subscription_active) return next();
    
    // Allow if trial hasn't ended
    if (trialEnd && trialEnd > now) return next();

    // Trial and subscription both expired - block access
    return res.status(402).json({ 
      message: "Subscription expired",
      code: "SUBSCRIPTION_EXPIRED"
    });
  } catch (err) {
    // If table doesn't exist or other error, allow for now
    console.error("Subscription check error:", err.message);
    next();
  }
};
