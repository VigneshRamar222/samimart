const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "samimartindia@gmail.com",
    pass: "Samimart@06"
  }
});

app.post("/send-mail", async (req, res) => {

  const { name, email, subject, message } = req.body;

  try {

    // Mail to Admin
    await transporter.sendMail({
      from: email,
      to: "samimart.tn@gmail.com",
      subject: "New Enquiry - SamiMart",
      text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\nMessage: ${message}`
    });

    // Auto reply to User
    await transporter.sendMail({
      from: "samimart.tn@gmail.com",
      to: email,
      subject: "Thank you for contacting SamiMart",
      text: `Hello ${name}, we received your enquiry and will respond soon.`
    });

    res.json({ success: true });

  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false });
  }

});

app.listen(3000, () => {
  console.log("Email bot running on port 3000");
});