import { Router } from 'express';
import { getSettings, updateSettings, backupDatabase, restoreDatabase } from '../controllers/settingsController';
import { authenticateJWT, requireSuperAdmin } from '../middleware/authMiddleware';
import { uploadJSON } from '../middleware/uploadMiddleware';

const router = Router();

// Protected routes (Require admin JWT)
router.get('/', authenticateJWT, getSettings);
router.post('/update', authenticateJWT, updateSettings);

// Super Admin only routes (Backup and Restore)
router.get('/backup', authenticateJWT, requireSuperAdmin, backupDatabase);
router.post('/restore', authenticateJWT, requireSuperAdmin, uploadJSON.single('file'), restoreDatabase);

export default router;
