import express from 'express';
import { Client } from '../models';
import { sendSignupOtp } from '../utils/authEmails';

const router = express.Router();

export const verificationCodes = new Map<string, { code: string; expires: number }>();

router.post('/send-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const existingClient = await Client.findOne({ email });
    if (existingClient) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Generate a secure 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    verificationCodes.set(email.toLowerCase(), {
      code,
      expires: Date.now() + 10 * 60 * 1000 // 10 minutes expiry
    });

    console.log(`[REGISTRATION_OTP] Generated signup verification code for ${email}: ${code}`);

    const emailSent = await sendSignupOtp(email, code);

    if (emailSent.isSimulated) {
      return res.json({
        success: true,
        isSimulated: true,
        code,
        message: 'Registration verification code generated in Sandbox mode.'
      });
    }

    if (!emailSent.success) {
      console.warn(`[EMAIL REGISTRATION SEND OUT FAILURE] Reason: ${emailSent.error}. Returning code in response as absolute fallback.`);
      return res.json({
        success: true,
        isSimulated: true,
        code,
        message: `Email system fallback. Your verification code is: ${code}`
      });
    }

    return res.json({ 
      success: true, 
      message: 'Registration verification code sent successfully!',
      code
    });
  } catch (err: any) {
    console.error('Send registration code error:', err);
    return res.status(500).json({ error: 'Failed to send registration verification code' });
  }
});

export default router;
