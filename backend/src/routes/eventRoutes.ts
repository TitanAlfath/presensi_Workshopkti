import { Router } from 'express';
import { getActiveEvent, createEvent, updateEvent, listEvents, setActiveEvent } from '../controllers/eventController';
import { authenticateJWT } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

// Public routes
router.get('/active', getActiveEvent);

// Protected routes (Require admin JWT)
router.get('/list', authenticateJWT, listEvents);
router.post(
  '/create',
  authenticateJWT,
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'banner', maxCount: 1 }
  ]),
  createEvent
);
router.put(
  '/update/:id',
  authenticateJWT,
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'banner', maxCount: 1 }
  ]),
  updateEvent
);
router.post('/set-active', authenticateJWT, setActiveEvent);

export default router;
