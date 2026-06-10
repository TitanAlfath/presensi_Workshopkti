import express from 'express';
import { 
  listParticipants, 
  forceCheckInParticipant, 
  exportParticipants,
  deleteMultipleParticipants,
  clearAllParticipants
} from '../controllers/participantController';

const router = express.Router();

// List all participants (with attendance status)
router.get('/list', listParticipants);

// Force check-in a participant
router.post('/force-check-in', forceCheckInParticipant);

// Export participants to Excel
router.get('/export/excel', exportParticipants);

// Delete multiple
router.post('/delete-multiple', deleteMultipleParticipants);

// Clear all
router.post('/clear-all', clearAllParticipants);

export default router;
