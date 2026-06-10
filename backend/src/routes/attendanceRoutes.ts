import { Router } from 'express';
import {
  checkIn,
  getStats,
  listAttendance,
  deleteAttendance,
  deleteMultipleAttendance,
  clearAllAttendance,
  exportExcel,
  exportPDF,
  importParticipants,
  lookupParticipantOrGuest,
  listPublicAttendance
} from '../controllers/attendanceController';
import { authenticateJWT } from '../middleware/authMiddleware';
import { upload, uploadExcel } from '../middleware/uploadMiddleware';

const router = Router();

// Public routes
router.post('/check-in', checkIn);
router.get('/lookup', lookupParticipantOrGuest);
router.get('/public-list', listPublicAttendance);

// Protected routes (Require admin JWT)
router.get('/stats', authenticateJWT, getStats);
router.get('/list', authenticateJWT, listAttendance);
router.delete('/delete/:id', authenticateJWT, deleteAttendance);
router.post('/delete-multiple', authenticateJWT, deleteMultipleAttendance);
router.post('/clear-all', authenticateJWT, clearAllAttendance);

// Export routes (can be accessed via query token or admin JWT)
// To support direct download links easily in standard browsers, we allow download with token query param,
// or standard headers. We can add a simple token check middleware if needed, or let authenticateJWT verify it.
// To make it easy, we protect it with authenticateJWT. The front-end can pass the token as a query parameter or header.
router.get('/export/excel', authenticateJWT, exportExcel);
router.get('/export/pdf', authenticateJWT, exportPDF);

router.post('/import/excel', authenticateJWT, uploadExcel.single('file'), importParticipants);

export default router;
