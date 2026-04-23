// server.js
require("dotenv").config(); // load .env variables
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const transporter = nodemailer.createTransport({
  service: "gmail", // or your email provider
  auth: {
    user: process.env.EMAIL_USER, // your email
    pass: process.env.EMAIL_PASS, // app password
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.log("Error configuring email transporter:", error);
  } else {
    console.log("Email transporter is ready");
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "assets/images/categories");
  },
  filename: (req, file, cb) => {
    const cleanName = file.originalname.replace(/\s+/g, "_");
    cb(null, Date.now() + "_" + cleanName);
  },
});
const upload = multer({ storage });
app.post("/upload-category", upload.single("image"), (req, res) => {
  try {
    console.log("category image upload API call reached");
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const imageUrl = `/assets/images/categories/${req.file.filename}`;
    res.json({ imageUrl });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

app.delete("/delete-image", (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) {
    return res.status(400).json({ error: "Image URL required" });
  }
  try {
    const filename = imageUrl.split("/images/categories/")[1];
    const filePath = path.join(__dirname, "assets/images/categories", filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }
});

app.post("/send-email", async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Thank you for contacting SamiMart!`,
      html: `<p>Hi ${name},</p>
             <p>We received your enquiry: <strong>${subject}</strong></p>
             <p>Our team will contact you soon. Thank you for reaching out!</p>
             <p>— SamiMart Team</p>`,
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL, // admin email from .env
      subject: `New enquiry from ${name}: ${subject}`,
      html: `<p><strong>Name:</strong> ${name}</p>
             <p><strong>Email:</strong> ${email}</p>
             <p><strong>Subject:</strong> ${subject}</p>
             <p><strong>Message:</strong><br>${message}</p>`,
    });

    res.status(200).json({ success: "mm Emails sent successfully!" });
  } catch (error) {
    console.error("Email error:", error);
    res.status(500).json({ error: "Failed to send emails" });
  }
});

app.post("/send-cart-enquiry", async (req, res) => {
  const { userName, contactNo, email, remarks, items } = req.body;

  try {
    if (!items || !items.length) {
      return res.status(400).json({ error: "Cart items missing" });
    }

    let cartRows = "";

    items.forEach((i) => {
      cartRows += `
      <tr>
        <td>${i.category}</td>
        <td>${i.subcategory}</td>
        <td>${i.item}</td>
        <td>${i.remark || "-"}</td>
      </tr>
      `;
    });

    const cartTable = `
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;">
        <tr style="background:#f2f2f2;">
          <th>Category</th>
          <th>Sub Category</th>
          <th>Item</th>
          <th>Remark</th>
        </tr>
        ${cartRows}
      </table>
    `;

    const adminMail = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: `New Product Enquiry from ${userName}`,
      html: `
        <h3>Customer Details</h3>
        <p><b>Name:</b> ${userName}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Contact:</b> ${contactNo}</p>
        <p><b>Remarks:</b> ${remarks || "-"}</p>

        <h3>Cart Items</h3>
        ${cartTable}
      `,
    };

    await transporter.sendMail(adminMail);

    const customerMail = {
      from: `"SamiMart" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "We received your enquiry - SamiMart",
      html: `
      <div style="font-family:Arial;line-height:1.6">

      <h2 style="color:#0d9488;">Thank you for contacting SamiMart!</h2>

      <p>Hi <b>${userName}</b>,</p>

      <p>
      We have successfully received your product enquiry.
      Our team will review your request and contact you shortly.
      </p>

      <h3>Your Enquiry Summary</h3>

      ${cartTable}

      <p style="margin-top:20px;">
      If you need urgent assistance, please contact us.
      </p>

      <p>
      📞 +91 96555 12111<br>
      📧 samimart.tn@gmail.com
      </p>

      <br>

      <p>Regards,<br>
      <b>SamiMart Team</b></p>

      </div>
      `,
    };

    await transporter.sendMail(customerMail);

    res.status(200).json({ success: "Emails sent successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to send enquiry" });
  }
});

app.use(express.static(path.join(__dirname, "public")));
app.use("/assets", express.static("assets"));

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.get("/", (req, res) => {
  res.send("API running");
});