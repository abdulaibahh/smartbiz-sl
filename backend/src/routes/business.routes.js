const router = require("express").Router();
const db = require("../config/db");
const auth = require("../middlewares/auth");
const path = require("path");
const fs = require("fs");

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

/* ================= UPLOAD LOGO ================= */

router.post("/logo", auth, async (req, res) => {
  try {
    const { logo } = req.body;
    
    if (!logo) {
      return res.status(400).json({ message: "Logo data required" });
    }

    // Validate base64 image
    const base64Data = logo.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    
    // Check file size (max 2MB)
    if (buffer.length > 2 * 1024 * 1024) {
      return res.status(400).json({ message: "Image too large. Max 2MB" });
    }

    // Save to uploads directory
    const uploadDir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = `logo-${req.user.business_id}-${Date.now()}.png`;
    const filepath = path.join(uploadDir, filename);
    
    fs.writeFileSync(filepath, buffer);
    
    // Get old logo to delete
    const oldResult = await db.query(
      "SELECT logo_url FROM businesses WHERE id=$1",
      [req.user.business_id]
    );
    
    const oldLogo = oldResult.rows[0]?.logo_url;
    
    // Update database with new logo URL
    const logoUrl = `/uploads/${filename}`;
    await db.query(
      "UPDATE businesses SET logo_url=$1 WHERE id=$2",
      [logoUrl, req.user.business_id]
    );

    // Delete old logo if it was a local upload
    if (oldLogo && oldLogo.startsWith("/uploads/")) {
      try {
        const oldPath = path.join(__dirname, "../../", oldLogo);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      } catch (e) {
        // Ignore delete errors
      }
    }

    res.json({ message: "Logo uploaded", logo_url: logoUrl });
  } catch (err) {
    console.error("Upload logo error:", err);
    res.status(500).json({ message: "Failed to upload logo" });
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
