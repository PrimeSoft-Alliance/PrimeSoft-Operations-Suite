import express from 'express';
import { Notification } from '../models';
import { EnvelopeResponse } from '../middlewares/envelope';
import { authMiddleware } from '../auth';
import { tenantContextMiddleware } from '../middlewares/tenantContext';

const router = express.Router();

router.use(authMiddleware);
router.use(tenantContextMiddleware);

const getCid = (req: any) => req.clientId;

router.get('/', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const notifications = await Notification.find({ clientId: getCid(req) }).sort({ createdAt: -1 });
    envRes.sendSuccess(notifications);
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Failed to fetch notifications');
  }
});

router.patch('/:id/read', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, clientId: getCid(req) },
      { isRead: true }
    );
    envRes.sendSuccess({ success: true });
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Update failed');
  }
});

router.post('/read-all', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    await Notification.updateMany(
      { clientId: getCid(req), isRead: false },
      { isRead: true }
    );
    envRes.sendSuccess({ success: true });
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Update failed');
  }
});

router.delete('/:id', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, clientId: getCid(req) });
    envRes.sendSuccess({ success: true });
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Delete failed');
  }
});

// DELETE /v1/notifications - Bulk delete notifications
router.delete('/', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = getCid(req);
    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Invalid credentials');

    const idsString = req.body.ids || req.query.ids;
    const ids = Array.isArray(idsString) ? idsString : (typeof idsString === 'string' ? idsString.split(',') : []);

    if (ids.length === 0) {
      return envRes.sendError(400, 'BAD_REQUEST', 'No IDs provided for deletion');
    }

    await Notification.deleteMany({ _id: { $in: ids }, clientId });
    envRes.sendSuccess({ success: true, message: `${ids.length} notifications deleted.` });
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Delete failed');
  }
});

export default router;
