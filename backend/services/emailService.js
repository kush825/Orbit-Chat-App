const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

const getBrevoApiKey = () => {
  // If BREVO_API_KEY is not set, fallback to SMTP_PASSWORD to make migration easier
  return process.env.BREVO_API_KEY || process.env.SMTP_PASSWORD;
};

const sendVerificationEmail = async (email, fullName, otp) => {
  const apiKey = getBrevoApiKey();
  if (!apiKey) {
    console.warn('⚠️ BREVO_API_KEY is not configured. Simulating email to', email);
    return { success: true, simulated: true };
  }

  const senderEmail = process.env.EMAIL_FROM || 'parmarkush0089@gmail.com';
  const senderName = process.env.EMAIL_FROM_NAME || 'Orbit Team';

  try {
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: senderName, email: senderEmail },
        to: [{ email, name: fullName }],
        subject: 'Orbit Email Verification OTP',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
            <h2 style="color: #4f46e5; text-align: center;">Orbit</h2>
            <p>Hello <strong>${fullName}</strong>,</p>
            <p>Your Orbit verification code is:</p>
            <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <span style="font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #1e293b;">${otp}</span>
            </div>
            <p>This OTP will expire in <strong>5 minutes</strong>.</p>
            <p style="color: #64748b; font-size: 14px;">If you did not create a Orbit account, you can ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">Regards,<br/>Orbit Team</p>
          </div>
        `
      },
      {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`Email sent successfully via Brevo: ${response.data.messageId}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending email via Brevo:', error.response?.data || error.message);
    throw new Error(`Failed to send verification email: ${error.response?.data?.message || error.message}`);
  }
};

const sendWelcomeEmail = async (email, fullName) => {
  const apiKey = getBrevoApiKey();
  if (!apiKey) {
    console.warn('⚠️ BREVO_API_KEY is not configured. Simulating Welcome email to', email);
    return { success: true, simulated: true };
  }

  const senderEmail = process.env.EMAIL_FROM || 'parmarkush0089@gmail.com';
  const senderName = process.env.EMAIL_FROM_NAME || 'Orbit Team';

  try {
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: senderName, email: senderEmail },
        to: [{ email, name: fullName }],
        subject: '🎉 Welcome to the Orbit Family! 🚀',
        htmlContent: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 3px; border-radius: 16px;">
            <div style="background-color: #ffffff; padding: 40px 30px; border-radius: 14px; text-align: center;">
              <h1 style="color: #4f46e5; margin-bottom: 10px; font-size: 28px;">Welcome to Orbit! 🎉</h1>
              <h2 style="color: #1e293b; font-size: 22px; margin-top: 20px;">Hi ${fullName},</h2>
              <p style="color: #475569; font-size: 16px; line-height: 1.6; text-align: left; margin-top: 20px;">
                We are absolutely thrilled to welcome you to the <strong>Orbit Family!</strong> 🚀
              </p>
              <p style="color: #475569; font-size: 16px; line-height: 1.6; text-align: left;">
                Your account has been successfully created and verified. You're now ready to connect with friends, join exciting group conversations, and experience seamless messaging.
              </p>
              <div style="margin: 35px 0;">
                <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}" style="background: linear-gradient(135deg, #4f46e5 0%, #818cf8 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 30px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(79, 70, 229, 0.4); display: inline-block;">Start Chatting Now ✨</a>
              </div>
              <p style="color: #64748b; font-size: 15px; margin-top: 30px;">
                If you have any questions or need help, just reply to this email!
              </p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
              <p style="color: #94a3b8; font-size: 14px; text-align: center; margin: 0;">
                Made with ❤️ by the<br/><strong style="color: #4f46e5;">Orbit Team</strong>
              </p>
            </div>
          </div>
        `
      },
      {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`Welcome Email sent successfully via Brevo: ${response.data.messageId}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending welcome email via Brevo:', error.response?.data || error.message);
    return { success: false };
  }
};

const sendPasswordResetEmail = async (email, fullName, otp) => {
  const apiKey = getBrevoApiKey();
  if (!apiKey) {
    console.warn('⚠️ BREVO_API_KEY is not configured. Simulating email to', email);
    return { success: true, simulated: true };
  }

  const senderEmail = process.env.EMAIL_FROM || 'parmarkush0089@gmail.com';
  const senderName = process.env.EMAIL_FROM_NAME || 'Orbit Team';

  try {
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: senderName, email: senderEmail },
        to: [{ email, name: fullName }],
        subject: 'Orbit Password Reset Request',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
            <h2 style="color: #4f46e5; text-align: center;">Orbit Password Reset</h2>
            <p>Hello <strong>${fullName}</strong>,</p>
            <p>We received a request to reset your password. Your password reset OTP is:</p>
            <div style="background-color: #fef2f2; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0; border: 1px solid #fca5a5;">
              <span style="font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #ef4444;">${otp}</span>
            </div>
            <p>This OTP will expire in <strong>10 minutes</strong>.</p>
            <p style="color: #64748b; font-size: 14px;">If you did not request a password reset, please safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">Regards,<br/>Orbit Team</p>
          </div>
        `
      },
      {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`Password reset email sent successfully via Brevo: ${response.data.messageId}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending password reset email via Brevo:', error.response?.data || error.message);
    throw new Error(`Failed to send password reset email: ${error.response?.data?.message || error.message}`);
  }
};

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
};
