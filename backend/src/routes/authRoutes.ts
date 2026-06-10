import { Router } from 'express';
import { login, register, getMe, changePassword } from '../controllers/authController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = Router();

// Public routes
router.post('/login', login);

// Register is self-governed (first user is auto-approved as Super Admin, subsequent users require Super Admin JWT)
router.post('/register', (req, res, next) => {
  // If request contains authorization header, check JWT, otherwise bypass check
  // authController.register will check if it's the first registration or not.
  if (req.headers.authorization) {
    return authenticateJWT(req, res, () => register(req, res));
  }
  register(req, res);
});

// Protected routes
router.get('/me', authenticateJWT, getMe);
router.post('/change-password', authenticateJWT, changePassword);

export default router;
