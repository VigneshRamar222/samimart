// server.js
require("dotenv").config(); // load .env variables
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const path = require("path");
const session = require("express-session");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: Number(process.env.SESSION_EXPIRE_MS),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    },
  }),
);

(async () => {
  const hash = "$2b$10$kGmK9cXx5ZP3rV8v1wF7cO0Sg2lTQy6X3fGz9ZJqLwV1n8Yx5hM0u";
  const result = await bcrypt.compare("admin123", hash);
  console.log(result);
})();

// const users = [
//   {
//     username: "admin",
//     email: "admin@samimart.com",
//     password: "$2b$10$wP7MZbQ9rZX7xkLq1l9fQO8s3Bz5m7GqXxC3QX6WnQe6KZrZcYk8S",
//     // this is encrypted version of: admin123
//   },
// ];

const users = JSON.parse(process.env.USERS);
console.log(users);
// Email transporter
const transporter = nodemailer.createTransport({
  service: "gmail", // or your email provider
  auth: {
    user: process.env.EMAIL_USER, // your email
    pass: process.env.EMAIL_PASS, // app password
  },
});

// Test transporter
transporter.verify((error, success) => {
  if (error) {
    console.log("Error configuring email transporter:", error);
  } else {
    console.log("Email transporter is ready");
  }
});

// Routes
app.get("/", (req, res) => {
  res.send("SamiMart Email Bot is running!");
});

app.post("/send-email", async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // 1️⃣ Send user auto-reply
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Thank you for contacting SamiMart!`,
      html: `<p>Hi ${name},</p>
             <p>We received your enquiry: <strong>${subject}</strong></p>
             <p>Our team will contact you soon. Thank you for reaching out!</p>
             <p>— SamiMart Team</p>`,
    });

    // 2️⃣ Send admin notification
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

  console.log("Cart enquiry received:", req.body);

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

    // ===============================
    // ADMIN EMAIL
    // ===============================

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

    // ===============================
    // CUSTOMER AUTO REPLY
    // ===============================

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

    //res.json({ success: true });

    res.status(200).json({ success: "Emails sent successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to send enquiry" });
  }
});

// Static folder (for images / uploads)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ------------------ API ROUTES ------------------
app.use("/api/categories", require("./routes/categories"));
app.use("/api/subcategories", require("./routes/subcategories"));

let loginAttempts = {};
let blockTime = 10 * 60 * 1000; // 10 minutes

app.post("/login-step1", async (req, res) => {
  try {
    //const ip = req.ip;

    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    // console.log(ip);
    if (loginAttempts[ip] && loginAttempts[ip].count > 5) {
      if (Date.now() < loginAttempts[ip].blockUntil) {
        return res.json({
          success: false,
          message: "Too many login attempts. Try again after 10 minutes.",
        });
      } else {
        loginAttempts[ip] = null; // unblock after time
      }
    }

    const { username, password } = req.body;

    // console.log(username);
    // console.log(password);
    // 1. Validate input
    if (!username || !password) {
      if (!loginAttempts[ip]) {
        loginAttempts[ip] = { count: 1, blockUntil: 0 };
      } else {
        loginAttempts[ip].count += 1;

        if (loginAttempts[ip].count > 5) {
          loginAttempts[ip].blockUntil = Date.now() + blockTime;
        }
      }

      return res
        .status(400)
        .json({ success: false, message: "Missing credentials" });
    }

    // 2. Find user
    const user = users.find((u) => u.username === username);
    console.log(user);
    if (!user) {
      if (!loginAttempts[ip]) {
        loginAttempts[ip] = { count: 1, blockUntil: 0 };
      } else {
        loginAttempts[ip].count += 1;

        if (loginAttempts[ip].count > 5) {
          loginAttempts[ip].blockUntil = Date.now() + blockTime;
        }
      }

      return res.json({
        success: false,
        message: "Invalid username or password",
      });
    }

    // 3. Compare encrypted password
    console.log(password);
    console.log(user.password);
    const isMatch = await bcrypt.compare(password, user.password);
    console.log(isMatch);
    if (!isMatch) {
      if (!loginAttempts[ip]) {
        loginAttempts[ip] = { count: 1, blockUntil: 0 };
      } else {
        loginAttempts[ip].count += 1;

        if (loginAttempts[ip].count > 5) {
          loginAttempts[ip].blockUntil = Date.now() + blockTime;
        }
      }

      return res.json({
        success: false,
        message: "Invalid username or password",
      });
    }

    delete loginAttempts[ip];

    // 4. Generate secure OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // 5. Save OTP in session
    req.session.loginOtp = otp;
    req.session.otpExpiry =
      Date.now() + Number(process.env.OTP_EXPIRE_SECONDS) * 1000;
    req.session.loginUser = user.username;

    // 6. Create login link
    //    const loginLink = `http://localhost:${PORT}/verify-login?otp=${otp}`;
    const loginLink = `${process.env.BASE_URL}/verify-login?otp=${otp}`;

    // 7. Send email to that user's mail id
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "SamiMart Secure Login Link",
      html: `
        <h3>Secure Login</h3>
        <p>Hello ${user.username},</p>
        <p>Click the link below to login:</p>
        <a href="${loginLink}">${loginLink}</a>
        <p>This login link will expire in ${process.env.OTP_EXPIRE_SECONDS} seconds.</p>
      `,
    });

    res.json({ success: true, message: "OTP login link sent to email" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/verify-login", (req, res) => {
  const { otp } = req.query;

  if (Date.now() > req.session.otpExpiry) {
    req.session.loginOtp = null;
    req.session.otpExpiry = null;
    return res.send("Login link expired. Please generate a new link.");
  }

  if (!req.session.loginOtp || !req.session.otpExpiry) {
    return res.send("Login session expired. Please try again.");
  }

  if (Date.now() > req.session.otpExpiry) {
    return res.send("Login link expired. Please generate a new link.");
  }

  if (otp === req.session.loginOtp) {
    //req.session.isLoggedIn = true;

    req.session.regenerate((err) => {
      if (err) return res.send("Session error");

      req.session.isLoggedIn = true;
      res.redirect("/master.html");
    });

    // Clear OTP after success
    req.session.loginOtp = null;
    req.session.otpExpiry = null;

    return res.redirect("/master.html");
  }

  res.send("Invalid login link.");
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/master.html", (req, res) => {
  if (!req.session.isLoggedIn) {
    return res.redirect("/login.html");
  }

  res.sendFile(path.join(__dirname, "public", "master.html"));
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login.html");
  });
});

// ------------------ 404 HANDLER (must be last) ------------------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});
// ------------------ ERROR HANDLER ------------------
app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});

// ------------------ SERVER START ------------------

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
