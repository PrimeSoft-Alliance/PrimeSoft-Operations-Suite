import express from 'express';
import { MediaAsset } from '../models';
import crypto from 'crypto';
import { EnvelopeResponse } from '../middlewares/envelope';

const router = express.Router();

router.get('/', async (req, res) => {
  const envRes = res as EnvelopeResponse;
  const clientId = (req as any).clientId;
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');
  
  const media = await MediaAsset.find({ clientId });
  envRes.sendSuccess(media);
});

router.post('/', async (req, res) => {
  const envRes = res as EnvelopeResponse;
  const clientId = (req as any).clientId;
  const { type, filename, mimeType, size, url, altText, caption } = req.body;
  
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');
  if (!filename || !mimeType || !size || !url) {
    return envRes.sendError(422, 'VALIDATION_FAILED', 'Missing required parameters');
  }

  try {
    const mediaId = crypto.randomUUID();
    const asset = await MediaAsset.create({
      mediaId,
      clientId,
      type,
      filename,
      mimeType,
      size,
      url,
      altText,
      caption
    });
    envRes.sendSuccess(asset);
  } catch (err: any) {
    envRes.sendError(500, 'SERVER_ERROR', err.message);
  }
});

router.post('/upload-url', async (req, res) => {
  const envRes = res as EnvelopeResponse;
  const clientId = (req as any).clientId;
  const { filename, mimeType, size } = req.body;
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');
  if (!filename || !mimeType || !size) {
    return envRes.sendError(422, 'VALIDATION_FAILED', 'Missing required parameters');
  }

  try {
    const mediaId = crypto.randomUUID();
    // In a real system, we generate AWS S3 Signed URL here. 
    // Mocking it:
    // Use dynamic domain from request
    const domain = req.get('host') || 'your-app.onrender.com';
    const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${domain}`;

    const uploadUrl = `${baseUrl}/upload/${mediaId}?sig=${crypto.randomBytes(8).toString('hex')}`;
    
    // We can pre-register the asset
    const asset = await MediaAsset.create({
      mediaId,
      clientId,
      type: mimeType.split('/')[0],
      filename,
      mimeType,
      size,
      url: `${baseUrl}/${clientId}/${mediaId}`,
      uploadStatus: 'pending'
    });

    envRes.sendSuccess({ uploadUrl, mediaId });
  } catch (err: any) {
    envRes.sendError(500, 'SERVER_ERROR', err.message);
  }
});

export default router;
