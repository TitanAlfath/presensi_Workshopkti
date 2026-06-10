import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'presensi_diesnat_super_secret_jwt_key_2026';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'ADMIN' | 'SUPER_ADMIN';
    name: string;
  };
}

export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Bearer <token>

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ message: 'Token tidak valid atau telah kedaluwarsa' });
      }

      (req as AuthRequest).user = user as AuthRequest['user'];
      next();
    });
  } else {
    res.status(401).json({ message: 'Akses ditolak. Token tidak ditemukan' });
  }
};

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as AuthRequest).user;
  
  if (!user || user.role !== 'SUPER_ADMIN') {
    return res.status(430).json({ message: 'Akses ditolak. Memerlukan hak akses Super Admin' });
  }
  
  next();
};
