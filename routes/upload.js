const express = require("express");
const router  = express.Router();
const multer  = require("multer");
const { uploadReport } = require("../controllers/uploadController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "application/pdf"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only PDF, JPG, PNG files are allowed"));
  },
});

// POST /api/upload  → { success, url }
router.post("/", upload.single("file"), uploadReport);

module.exports = router;
