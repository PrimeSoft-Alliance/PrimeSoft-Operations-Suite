import { sendEmail } from '../email';

const authEmailStyle = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 40px 20px;
      box-sizing: border-box;
    }
    .container {
      max-width: 540px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }
    .header {
      text-align: center;
      padding: 32px 20px 0 20px;
    }
    .badge-primary {
      display: inline-block;
      font-size: 24px;
      font-weight: 900;
      color: #4f46e5;
      border: 2px solid #4f46e5;
      padding: 6px 16px;
      border-radius: 12px;
      letter-spacing: -0.5px;
    }
    .badge-success {
      display: inline-block;
      font-size: 24px;
      font-weight: 900;
      color: #10b981;
      border: 2px solid #10b981;
      padding: 6px 16px;
      border-radius: 12px;
      letter-spacing: -0.5px;
    }
    .badge-warning {
      display: inline-block;
      font-size: 24px;
      font-weight: 900;
      color: #ea580c;
      border: 2px solid #ea580c;
      padding: 6px 16px;
      border-radius: 12px;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 0 40px 40px 40px;
    }
    h2 {
      color: #0f172a;
      text-align: center;
      font-size: 20px;
      font-weight: 800;
      margin-top: 24px;
      margin-bottom: 8px;
    }
    .subtitle {
      text-align: center;
      font-size: 13px;
      font-weight: 600;
      margin-top: 0;
      margin-bottom: 30px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .subtitle.primary { color: #64748b; }
    .subtitle.success { color: #10b981; }
    .subtitle.warning { color: #ea580c; }
    p {
      font-size: 14px;
      color: #334155;
      line-height: 1.6;
      font-weight: 500;
      margin-bottom: 24px;
    }
    .code-box {
      font-size: 34px;
      font-weight: 900;
      letter-spacing: 8px;
      text-align: center;
      margin: 32px 0;
      padding: 20px;
      border-radius: 16px;
      user-select: all;
    }
    .code-box.primary {
      color: #4f46e5;
      background-color: #f5f3ff;
      border: 1px solid #e0e7ff;
    }
    .code-box.success {
      color: #10b981;
      background-color: #ecfdf5;
      border: 1px solid #d1fae5;
    }
    .code-box.warning {
      color: #ea580c;
      background-color: #fff7ed;
      border: 1px solid #fed7aa;
    }
    .footer-note {
      font-size: 12px;
      color: #64748b;
      text-align: center;
      margin-bottom: 0;
    }
    .footer {
      border-top: 1px solid #f1f5f9;
      padding: 30px 20px;
      text-align: center;
      background-color: #ffffff;
    }
    .footer-brand {
      font-size: 11px;
      color: #94a3b8;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 4px 0;
    }
    .footer-sub {
      font-size: 10px;
      color: #cbd5e1;
      font-weight: 500;
      margin: 0;
    }
    
    @media only screen and (max-width: 600px) {
      .wrapper { padding: 0 !important; }
      .container { border-radius: 0 !important; border: none !important; border-bottom: 1px solid #e2e8f0 !important; }
      .content { padding: 0 20px 32px 20px !important; }
      .code-box { font-size: 28px !important; letter-spacing: 6px !important; }
    }
  </style>
</head>
<body>
`;

/**
 * Returns the email subject, text, and styled HTML for client registration / signup.
 */
export function getSignupOtpEmail(code: string) {
  const subject = 'OminiRep Workspace Activation Code';
  const textStr = `Hello,\n\nPlease confirm and activate your OminiRep workspace by entering the secure 6-digit confirmation code below in your browser session:\n\n${code}\n\nThis one-time code will expire in 10 minutes.\nIf you did not request this action, please disregard this message.\n\nOminiRep\nA PrimeSoft Alliance Platform`;
  
  const htmlStr = `
    ${authEmailStyle}
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <span class="badge-primary">OminiRep</span>
          </div>
          <div class="content">
            <h2>Workspace Activation Code</h2>
            <p class="subtitle primary">Confirm your digital workspace</p>
            <p>Hello,</p>
            <p>Welcome to OminiRep! Please confirm and activate your new business workspace by entering the secure 6-digit confirmation code below in your registration screen:</p>
            
            <div class="code-box primary">${code}</div>
            
            <p class="footer-note">This verification code will expire in 10 minutes.<br/>If you did not initiate this workspace registration, please ignore this message.</p>
          </div>
          <div class="footer">
            <p class="footer-brand">OminiRep</p>
            <p class="footer-sub">A PrimeSoft Alliance Platform</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, text: textStr, html: htmlStr };
}

/**
 * Returns the email subject, text, and styled HTML for 2FA client sign-in / login.
 */
export function getLoginOtpEmail(code: string) {
  const subject = 'Secure Account Login Verification OTP';
  const textStr = `Hello,\n\nPlease confirm your sign-in to OminiRep by entering the secure 6-digit login confirmation code below in your browser session:\n\n${code}\n\nThis login code is temporary and will expire in 10 minutes.\nIf you did not request this action, please secure your login credentials immediately.\n\nOminiRep\nA PrimeSoft Alliance Platform`;
  
  const htmlStr = `
    ${authEmailStyle}
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <span class="badge-success">OminiRep Secure</span>
          </div>
          <div class="content">
            <h2>Login Verification Code</h2>
            <p class="subtitle success">Secure Portal Access</p>
            <p>Hello,</p>
            <p>A sign-in request was initiated for your OminiRep portal. Please enter the secure 6-digit verification code below to authorize this browser session:</p>
            
            <div class="code-box success">${code}</div>
            
            <p class="footer-note">This login code is temporary and will expire in 10 minutes.<br/>If you did not request this action, please secure your login credentials immediately.</p>
          </div>
          <div class="footer">
            <p class="footer-brand">OminiRep</p>
            <p class="footer-sub">A PrimeSoft Alliance Platform</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, text: textStr, html: htmlStr };
}

/**
 * Returns the email subject, text, and styled HTML for administrative password reset.
 */
export function getPasswordResetOtpEmail(code: string) {
  const subject = 'Your Secure OTP for Password Reset';
  const textStr = `Hello,\n\nWe have verified your account details successfully! Your temporary password reset key is: ${code}\n\nThis OTP is valid for 15 minutes.\n\nWarm regards,\nThe Security Team`;
  
  const htmlStr = `
    ${authEmailStyle}
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <span class="badge-warning">OminiRep Core</span>
          </div>
          <div class="content">
            <h2>Administrative Reset Key</h2>
            <p class="subtitle warning">Identity Verified Successfully</p>
            <p>Hello,</p>
            <p>Please enter this secure, temporary 6-digit confirmation key within your browser session to reset your administrative master password:</p>
            
            <div class="code-box warning">${code}</div>
            
            <p class="footer-note">This reset key is valid for 15 minutes.<br/>If you did not request this, please notify your system administrator immediately.</p>
          </div>
          <div class="footer">
            <p class="footer-brand">OminiRep Security</p>
            <p class="footer-sub">A PrimeSoft Alliance Platform</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, text: textStr, html: htmlStr };
}

/**
 * Dedicated helper functions to send OTP emails.
 */
export async function sendSignupOtp(email: string, code: string) {
  const { subject, text, html } = getSignupOtpEmail(code);
  return sendEmail(email, subject, text, html);
}

export async function sendLoginOtp(email: string, code: string) {
  const { subject, text, html } = getLoginOtpEmail(code);
  return sendEmail(email, subject, text, html);
}

export async function sendPasswordResetOtp(email: string, code: string) {
  const { subject, text, html } = getPasswordResetOtpEmail(code);
  return sendEmail(email, subject, text, html);
}
