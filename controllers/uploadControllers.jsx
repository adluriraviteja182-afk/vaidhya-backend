const cloudinary = require("cloudinary").v2;

// Configure Cloudinary from Railway env vars
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// POST /api/upload
async function uploadReport(req, res) {
  try {
    if (!req.file)
      return res.status(400).json({ success: false, message: "No file provided." });

    if (!process.env.CLOUDINARY_CLOUD_NAME)
      return res.status(500).json({ success: false, message: "File upload not configured." });

    // Upload buffer to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder:    "pragyan-clinic/reports",
          resource_type: "auto", // handles PDF + images
          use_filename: false,
          unique_filename: true,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    return res.json({
      success: true,
      url:       result.secure_url,
      public_id: result.public_id,
      format:    result.format,
    });
  } catch (err) {
    console.error("uploadReport error:", err.message);
    return res.status(500).json({ success: false, message: "Upload failed: " + err.message });
  }
}

module.exports = { uploadReport };
