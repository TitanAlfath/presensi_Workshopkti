import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

const JWT_SECRET = process.env.JWT_SECRET || 'presensi_diesnat_super_secret_jwt_key_2026';

// Register User
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Email, password, dan nama harus diisi!' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email sudah terdaftar!' });
    }

    // Check if there are existing users in the system.
    // If there is at least one user, the registrant must be a Super Admin.
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      const requester = (req as AuthRequest).user;
      if (!requester || requester.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
          message: 'Hanya Super Admin yang diizinkan untuk mendaftarkan Admin baru.'
        });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user. If it's the first user, default to SUPER_ADMIN.
    const finalRole = userCount === 0 ? 'SUPER_ADMIN' : (role || 'ADMIN');

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: finalRole
      }
    });

    res.status(201).json({
      message: 'Registrasi berhasil',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      }
    });
  } catch (error: any) {
    console.error('Error in registration:', error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server saat registrasi', error: error.message });
  }
};

// Login User
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email dan password harus diisi!' });
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Email atau password salah!' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Email atau password salah!' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('Error in login:', error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server saat login', error: error.message });
  }
};

// Get current logged-in user profile
export const getMe = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    if (!user) {
      return res.status(401).json({ message: 'Tidak terautentikasi' });
    }

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    if (!fullUser) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    res.status(200).json(fullUser);
  } catch (error: any) {
    console.error('Error in getMe:', error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server', error: error.message });
  }
};

// Change Password
export const changePassword = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    if (!user) {
      return res.status(401).json({ message: 'Tidak terautentikasi' });
    }

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Password lama dan baru harus diisi!' });
    }

    const fullUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!fullUser) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    const isMatch = await bcrypt.compare(oldPassword, fullUser.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Password lama salah!' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    res.status(200).json({ message: 'Password berhasil diubah. Sekarang password hanya diketahui oleh Anda.' });
  } catch (error: any) {
    console.error('Error in changePassword:', error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server', error: error.message });
  }
};
