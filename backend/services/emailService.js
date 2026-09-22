const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');

// We are assuming dotenv is configured at the server start, but it doesn't hurt.
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER, 
    pass: process.env.SMTP_PASSWORD,
  },
});

/**
 * Send an OTP verification email
 * @param {string} email - Recipient email
 * @param {string} fullName - Recipient full name
 * @param {string} otp - 6 digit OTP
 */
const sendVerificationEmail = async (email, fullName, otp) => {
  if (!process.env.SMTP_USER) {
    console.warn('⚠️ SMTP_USER is not configured. Email will not be sent in production.');
    console.warn(`Simulating email to ${email} with OTP: ${otp}`);
    return { success: true, simulated: true };
  }

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'Orbit Team'}" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: 'Orbit Email Verification OTP',
    text: `Hello ${fullName},\n\nYour Orbit verification code is:\n\n${otp}\n\nThis OTP will expire in 5 minutes.\n\nIf you did not create a Orbit account, you can ignore this email.\n\nRegards,\nOrbit Team`,
    html: `
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
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.messageId}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send verification email');
  }
};

/**
 * Send a Welcome email after successful registration
 * @param {string} email - Recipient email
 * @param {string} fullName - Recipient full name
 */
const sendWelcomeEmail = async (email, fullName) => {
  if (!process.env.SMTP_USER) {
    console.warn('⚠️ SMTP_USER is not configured. Email will not be sent in production.');
    console.warn(`Simulating Welcome email to ${email}`);
    return { success: true, simulated: true };
  }

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'Orbit Team'}" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: '🎉 Welcome to the Orbit Family! 🚀',
    text: `Hello ${fullName},\n\nWelcome to Orbit! We are absolutely thrilled to have you join our community.\n\nYou can now start messaging your friends, joining groups, and exploring the app.\n\nHappy chatting!\n\nRegards,\nThe Orbit Team`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 3px; border-radius: 16px;">
        <div style="background-color: #ffffff; padding: 40px 30px; border-radius: 14px; text-align: center;">
          <h1 style="color: #4f46e5; margin-bottom: 10px; font-size: 28px;">Welcome to Orbit! 🎉</h1>
          
          <img src="cid:logo@orbit.app" alt="Orbit Logo" style="width: 100px; height: 100px; margin: 20px auto; border-radius: 20%; box-shadow: 0 4px 15px rgba(79, 70, 229, 0.2);" />

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
    `,
    attachments: [{
      filename: 'logo.png',
      path: path.join(__dirname, '../../frontend/public/logo.png'),
      cid: 'logo@orbit.app',
      contentType: 'image/png',
      contentDisposition: 'inline'
    }]
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Welcome Email sent: ${info.messageId}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Don't throw error here so we don't break the registration flow if welcome email fails
    return { success: false };
  }
};

/**
 * Send a Password Reset OTP email
 * @param {string} email - Recipient email
 * @param {string} fullName - Recipient full name
 * @param {string} otp - 6 digit OTP
 */
const sendPasswordResetEmail = async (email, fullName, otp) => {
  if (!process.env.SMTP_USER) {
    console.warn('⚠️ SMTP_USER is not configured. Email will not be sent in production.');
    console.warn(`Simulating Password Reset email to ${email} with OTP: ${otp}`);
    return { success: true, simulated: true };
  }

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'Orbit Team'}" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: 'Orbit Password Reset Request',
    text: `Hello ${fullName},\n\nWe received a request to reset your Orbit password.\n\nYour password reset OTP is:\n\n${otp}\n\nThis OTP will expire in 10 minutes.\n\nIf you did not request this, please ignore this email and your password will remain unchanged.\n\nRegards,\nOrbit Team`,
    html: `
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
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent: ${info.messageId}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
};
