import nodemailer from "nodemailer";
import hbs from "nodemailer-express-handlebars";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.hostinger.com",
  secure: true,
  port: process.env.SMTP_PORT || 465,
  auth: {
    user: process.env.SMTP_USER || "official@looopmusic.com",
    pass: process.env.SMTP_PASS || "Looopmusic@$12",
  },
  logger: true,
  debug: true,
});

const handlebarOptions = {
  viewEngine: {
    extName: ".hbs",
    partialsDir: path.resolve(__dirname, "./emails/"),
    defaultLayout: false,
  },
  viewPath: path.resolve(__dirname, "./emails/"),
  extName: ".hbs",
};

transporter.use("compile", hbs(handlebarOptions));

export const sendEmail = async (to, subject, template, context) => {
  try {
    const mailOptions = {
      from: `Looop Music <official@looopmusic.com>`,
      to,
      subject,
      template,
      context,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
    return { success: true, message: "Email sent successfully!" };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, message: error.message };
  }
};
