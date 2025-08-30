require("dotenv").config();
const nodemailer = require("nodemailer");

console.log("User:", process.env.GMAIL_USER);
console.log("Pass length:", process.env.GMAIL_APP_PASSWORD?.length);

(async () => {
  try {
    let transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // SSL
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    let info = await transporter.sendMail({
      from: `"ZetaCorp Test" <${process.env.GMAIL_USER}>`,
      to: "aravind94977034@gmail.com",
      subject: "✅ Test mail",
      text: "This is a working test mail using Gmail + App Password",
    });

    console.log("Mail sent successfully:", info.response);
  } catch (err) {
    console.error("SEND ERROR:", err);
  }
})();
