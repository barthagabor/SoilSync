import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();
import { colors } from "../config/colors.js";

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});
export async function sendVerificationEmail(email, token) {
    const verifyUrl = `http://localhost:5000/verify/${token}`;

    await transporter.sendMail({
        from: `"SoilSync" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Verify your SoilSync account",
        text: `Welcome to SoilSync! Click the link below to verify your email:\n${verifyUrl}`,
        html: soilSyncTemplate({
            title: "Welcome to SoilSync",
            message: "Click below to verify your email address:",
            buttonText: "Verify Email",
            link: verifyUrl,
        }),
    });

    console.log(`📨 Verification email sent to ${email}`);
}


export async function sendPasswordResetEmail(toEmail, token) {
    const frontendBase = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetUrl = `${frontendBase}/reset-password/${token}`;

    const html = `
    <div style="font-family: Arial, sans-serif; line-height:1.5; color:#111; background-color:${colors.landingPage}; padding: 30px; border-radius: 10px;">
      <p>You can set your new password with the button below (link valid for 30 minutes):</p>
      <p>
        <a href="${resetUrl}"
           style="display:inline-block;padding:12px 18px;background:${colors.landingPageIcons};color:#ffffff !important;
                  border-radius:8px;text-decoration:none;font-weight:600">
          Password reset
        </a>
      </p>
      <p style="font-size:13px;color:#555;">
        If the button doesn't work, copy this link into your browser:<br/>
        <span style="word-break:break-all;">${resetUrl}</span>
      </p>
    </div>`;

    await transporter.sendMail({
        from: `"SoilSync" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: "SoilSync – Password Reset",
        html,
    });
}


function soilSyncTemplate({ title, message, buttonText, link }) {
    return `
    <div style="font-family: Arial, sans-serif; color: #1b1b1b; background-color: ${colors.landingPage}; padding: 30px; border-radius: 10px; max-width: 500px; margin: auto;">
        <div style="text-align:center; margin-bottom: 20px;">
            <h2 style="color:${colors.darkLandingPageIcons};">${title}</h2>
        </div>
        <p style="font-size: 16px; line-height: 1.5; text-align: center;">
            ${message}
        </p>
        <div style="text-align: center; margin: 25px 0;">
            <a href="${link}"
                style="background-color:${colors.landingPageIcons}; color:white; padding:12px 24px; text-decoration:none;
                border-radius:8px; font-weight:bold; display:inline-block;">
                ${buttonText}
            </a>
        </div>
        <p style="font-size:13px; color:#6b7280; text-align:center; margin-top:20px;">
            If you didn’t request this, you can safely ignore this email.<br>
            © ${new Date().getFullYear()} SoilSync
        </p>
    </div>
  `;
}
