import dotenv from "dotenv";
import { colors } from "../config/colors.js";

dotenv.config();

const normalizeEnvValue = (value) => {
    if (value === null || value === undefined) return "";
    return String(value).trim();
};

const trimTrailingSlash = (value) => normalizeEnvValue(value).replace(/\/+$/, "");

const emailProvider = normalizeEnvValue(process.env.EMAIL_PROVIDER || "brevo").toLowerCase();

const emailFrom = normalizeEnvValue(process.env.EMAIL_FROM);
const emailFromName = normalizeEnvValue(process.env.EMAIL_FROM_NAME) || "SoilSync";
const brevoApiKey = normalizeEnvValue(process.env.BREVO_API_KEY);

const resolveBackendPublicUrl = () =>
    trimTrailingSlash(process.env.BACKEND_PUBLIC_URL) ||
    trimTrailingSlash(process.env.RENDER_EXTERNAL_URL) ||
    `http://localhost:${normalizeEnvValue(process.env.PORT) || "5000"}`;

const resolveFrontendPublicUrl = () =>
    trimTrailingSlash(process.env.FRONTEND_URL) || "http://localhost:5173";

const assertEmailSenderConfigured = () => {
    if (emailProvider !== "brevo") {
        throw new Error("Email delivery is configured for Brevo API only. Set EMAIL_PROVIDER=brevo.");
    }

    if (!brevoApiKey) {
        throw new Error("Brevo email delivery is not configured. Set BREVO_API_KEY.");
    }

    if (!emailFrom) {
        throw new Error("Email delivery is not configured. Set EMAIL_FROM.");
    }
};

export const isEmailDeliveryConfigured = () => {
    return emailProvider === "brevo" && Boolean(brevoApiKey && emailFrom);
};

const sendWithBrevo = async ({ to, subject, text, html }) => {
    assertEmailSenderConfigured();

    console.log("Brevo email config:", {
        provider: emailProvider,
        from: emailFrom,
        fromName: emailFromName,
        to,
        subject,
    });

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
            "accept": "application/json",
            "api-key": brevoApiKey,
            "content-type": "application/json",
        },
        body: JSON.stringify({
            sender: {
                name: emailFromName,
                email: emailFrom,
            },
            to: [
                {
                    email: to,
                },
            ],
            subject,
            htmlContent: html,
            textContent: text,
        }),
    });

    const responseText = await response.text();

    if (!response.ok) {
        console.error("Brevo email failed:", {
            status: response.status,
            statusText: response.statusText,
            body: responseText,
        });

        throw new Error(`Brevo email failed with status ${response.status}: ${responseText}`);
    }

    console.log("Brevo email sent:", {
        status: response.status,
        body: responseText,
    });

    return responseText;
};

const deliverEmail = async (payload) => {
    await sendWithBrevo(payload);
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