import nodemailer from "nodemailer";
import hbs from "nodemailer-express-handlebars";
import path from "path";
import dotenv from 'dotenv';
dotenv.config();

// Use Node's built-in __dirname and __filename for CommonJS modules
const __dirname = path.resolve();

// Create email transporter with error handling
const createTransporter = () => {
  try {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.hostinger.com",
      secure: true,
      port: Number(process.env.SMTP_PORT) || 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      logger: true,
      debug: true,
    });
  } catch (error) {
    console.error("Error creating mail transporter:", error);
    throw new Error("Failed to create mail transporter");
  }
};

const transporter = createTransporter();

// Configure handlebars template engine
const handlebarOptions = {
  viewEngine: {
    extName: ".hbs",
    partialsDir: path.resolve(__dirname, "./emails/"),
    defaultLayout: false,
  },
  viewPath: path.resolve(__dirname, "./emails/"),
  extName: ".hbs",
};

// Apply handlebars template engine with error handling
try {
  transporter.use("compile", hbs(handlebarOptions));
} catch (error) {
  console.error("Error setting up handlebars:", error);
  throw new Error("Failed to setup email templates");
}

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  context: Record<string, unknown>;
}

export const sendEmail = async ({ to, subject, template, context }: EmailOptions) => {
  if (!to || !subject || !template) {
    return { success: false, message: "Missing required email parameters" };
  }

  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || "Looop Music <official@looopmusic.com>",
      to,
      subject,
      template,
      context,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.messageId);
    return { success: true, message: "Email sent successfully!", messageId: info.messageId };
  } catch (error) {
    console.error("Error sending email:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred while sending email"
    };
  }
};
