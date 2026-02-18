const router = require("express").Router();
const db = require("../config/db");
const auth = require("../middlewares/auth");

/* ================= GET BUSINESS SETTINGS ================= */

router.get("/", auth, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, name, shop_name, address, phone, logo_url FROM businesses WHERE id=$1",
      [req.user.business_id]
    );
    
    if (!result.rows.length) {
      return res.status(404).json({ message: "Business not found" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get business error:", err);
    res.status(500).json({ message: "Failed to fetch business" });
  }
});

/* ================= UPDATE BUSINESS SETTINGS ================= */

router.put("/", auth, async (req, res) => {
  try {
    const { shop_name, address, phone, logo_url } = req.body;
    
    const result = await db.query(
      `UPDATE businesses 
       SET shop_name = COALESCE($1, shop_name),
           address = COALESCE($2, address),
           phone = COALESCE($3, phone),
           logo_url = COALESCE($4, logo_url)
       WHERE id=$5
       RETURNING id, name, shop_name, address, phone, logo_url`,
      [shop_name, address, phone, logo_url, req.user.business_id]
    );
    
    res.json({ message: "Business updated", business: result.rows[0] });
  } catch (err) {
    console.error("Update business error:", err);
    res.status(500).json({ message: "Failed to update business" });
  }
});

module.exports = router;
