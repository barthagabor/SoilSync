import dotenv from "dotenv";
import { colors } from "../config/colors.js";

dotenv.config();

const normalizeEnvValue = (value) => {
    if (value === null || value === undefined) return "";
    return String(value).trim();
};

const trimTrailingSlash = (value) => normalizeEnvValue(value).replace(/\/+$/, "");

const EMAIL_PROVIDER_RESEND = "resend";
const EMAIL_PROVIDER_BREVO = "brevo";
const emailProvider = normalizeEnvValue(process.env.EMAIL_PROVIDER || EMAIL_PROVIDER_RESEND).toLowerCase();

const emailFrom = normalizeEnvValue(process.env.EMAIL_FROM);
const emailFromName = normalizeEnvValue(process.env.EMAIL_FROM_NAME) || "SoilSync";
const brevoApiKey = normalizeEnvValue(process.env.BREVO_API_KEY);
const resendApiKey = normalizeEnvValue(process.env.RESEND_API_KEY);
const emailReplyTo = normalizeEnvValue(process.env.EMAIL_REPLY_TO);

const resolveBackendPublicUrl = () =>
    trimTrailingSlash(process.env.BACKEND_PUBLIC_URL) ||
    trimTrailingSlash(process.env.RENDER_EXTERNAL_URL) ||
    `http://localhost:${normalizeEnvValue(process.env.PORT) || "5000"}`;

const resolveFrontendPublicUrl = () =>
    trimTrailingSlash(process.env.FRONTEND_URL) || "http://localhost:5173";

const assertEmailSenderConfigured = (provider = emailProvider) => {
    if (!emailFrom) {
        throw new Error("Email delivery is not configured. Set EMAIL_FROM.");
    }

    if (provider === EMAIL_PROVIDER_RESEND && !resendApiKey) {
        throw new Error("Resend email delivery is not configured. Set RESEND_API_KEY.");
    }

    if (provider === EMAIL_PROVIDER_BREVO && !brevoApiKey) {
        throw new Error("Brevo email delivery is not configured. Set BREVO_API_KEY.");
    }

    if (![EMAIL_PROVIDER_RESEND, EMAIL_PROVIDER_BREVO].includes(provider)) {
        throw new Error("Unsupported email provider. Set EMAIL_PROVIDER to resend or brevo.");
    }
};

export const isEmailDeliveryConfigured = () => {
    if (emailProvider === EMAIL_PROVIDER_RESEND) {
        return Boolean(resendApiKey && emailFrom);
    }

    if (emailProvider === EMAIL_PROVIDER_BREVO) {
        return Boolean(brevoApiKey && emailFrom);
    }

    return false;
};

const sendWithBrevo = async ({ to, subject, text, html }) => {
    assertEmailSenderConfigured(EMAIL_PROVIDER_BREVO);

    console.log("Brevo email config:", {
        provider: EMAIL_PROVIDER_BREVO,
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

const sendWithResend = async ({ to, subject, text, html }) => {
    assertEmailSenderConfigured(EMAIL_PROVIDER_RESEND);

    const headers = {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
    };
    const replyTo = emailReplyTo || undefined;

    console.log("Resend email config:", {
        provider: EMAIL_PROVIDER_RESEND,
        from: emailFrom,
        fromName: emailFromName,
        to,
        subject,
        hasReplyTo: Boolean(replyTo),
    });

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers,
        body: JSON.stringify({
            from: emailFromName ? `${emailFromName} <${emailFrom}>` : emailFrom,
            to: [to],
            subject,
            html,
            text,
            reply_to: replyTo,
        }),
    });

    const responseText = await response.text();

    if (!response.ok) {
        console.error("Resend email failed:", {
            status: response.status,
            statusText: response.statusText,
            body: responseText,
        });

        throw new Error(`Resend email failed with status ${response.status}: ${responseText}`);
    }

    console.log("Resend email sent:", {
        status: response.status,
        body: responseText,
    });

    return responseText;
};

const deliverEmail = async (payload) => {
    if (emailProvider === EMAIL_PROVIDER_RESEND) {
        await sendWithResend(payload);
        return;
    }

    if (emailProvider === EMAIL_PROVIDER_BREVO) {
        await sendWithBrevo(payload);
        return;
    }

    throw new Error("Unsupported email provider. Set EMAIL_PROVIDER to resend or brevo.");
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
