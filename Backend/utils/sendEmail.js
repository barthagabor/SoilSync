import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { colors } from "../config/colors.js";

dotenv.config();

const normalizeEnvValue = (value) => {
    if (value === null || value === undefined) return "";
    return String(value).trim();
};

const trimTrailingSlash = (value) => normalizeEnvValue(value).replace(/\/+$/, "");

const parseBooleanEnv = (value, fallback) => {
    const normalized = normalizeEnvValue(value).toLowerCase();
    if (!normalized) return fallback;
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
    return fallback;
};

const emailProvider = (
    normalizeEnvValue(process.env.EMAIL_PROVIDER) ||
    (normalizeEnvValue(process.env.RESEND_API_KEY) ? "resend" : "smtp")
).toLowerCase();

const emailFrom = normalizeEnvValue(process.env.EMAIL_FROM) || normalizeEnvValue(process.env.EMAIL_USER);
const emailReplyTo = normalizeEnvValue(process.env.EMAIL_REPLY_TO);
const smtpHost = normalizeEnvValue(process.env.EMAIL_HOST) || "smtp.gmail.com";
const smtpPort = Number(normalizeEnvValue(process.env.EMAIL_PORT) || 465);
const smtpSecure = parseBooleanEnv(process.env.EMAIL_SECURE, smtpPort === 465);

const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
        user: normalizeEnvValue(process.env.EMAIL_USER),
        pass: normalizeEnvValue(process.env.EMAIL_PASS),
    },
});

const resolveBackendPublicUrl = () =>
    trimTrailingSlash(process.env.BACKEND_PUBLIC_URL) ||
    trimTrailingSlash(process.env.RENDER_EXTERNAL_URL) ||
    `http://localhost:${normalizeEnvValue(process.env.PORT) || "5000"}`;

const resolveFrontendPublicUrl = () =>
    trimTrailingSlash(process.env.FRONTEND_URL) || "http://localhost:5173";

const assertEmailSenderConfigured = () => {
    if (!emailFrom) {
        throw new Error("Email delivery is not configured. Set EMAIL_FROM or EMAIL_USER.");
    }
};

const sendWithSmtp = async ({ to, subject, text, html }) => {
    if (!normalizeEnvValue(process.env.EMAIL_USER) || !normalizeEnvValue(process.env.EMAIL_PASS)) {
        throw new Error("SMTP email delivery is not configured. Set EMAIL_USER and EMAIL_PASS.");
    }

    await transporter.sendMail({
        from: `"SoilSync" <${emailFrom}>`,
        to,
        subject,
        text,
        html,
        ...(emailReplyTo ? { replyTo: emailReplyTo } : {}),
    });
};

const sendWithResend = async ({ to, subject, text, html }) => {
    const apiKey = normalizeEnvValue(process.env.RESEND_API_KEY);
    if (!apiKey) {
        throw new Error("Resend email delivery is not configured. Set RESEND_API_KEY.");
    }

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "User-Agent": "SoilSync/1.0",
        },
        body: JSON.stringify({
            from: emailFrom,
            to: [to],
            subject,
            text,
            html,
            ...(emailReplyTo ? { reply_to: emailReplyTo } : {}),
        }),
    });

    if (!response.ok) {
        const details = await response.text().catch(() => "");
        throw new Error(`Resend email delivery failed with status ${response.status}.${details ? ` ${details}` : ""}`);
    }
};

const deliverEmail = async (payload) => {
    assertEmailSenderConfigured();

    if (emailProvider === "resend") {
        await sendWithResend(payload);
        return;
    }

    await sendWithSmtp(payload);
};

export async function sendVerificationEmail(email, token) {
    const verifyUrl = `${resolveBackendPublicUrl()}/verify/${token}`;

    await deliverEmail({
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

    console.log(`Verification email sent to ${email}`);
}

export async function sendPasswordResetEmail(toEmail, token) {
    const frontendBase = resolveFrontendPublicUrl();
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
        If the button does not work, copy this link into your browser:<br/>
        <span style="word-break:break-all;">${resetUrl}</span>
      </p>
    </div>`;

    await deliverEmail({
        to: toEmail,
        subject: "SoilSync - Password Reset",
        text: `Reset your SoilSync password here: ${resetUrl}`,
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
            If you did not request this, you can safely ignore this email.<br>
            &copy; ${new Date().getFullYear()} SoilSync
        </p>
    </div>
  `;
}
