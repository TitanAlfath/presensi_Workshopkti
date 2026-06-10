import { Request, Response } from 'express';
import prisma from '../config/db';
import { exportDatabaseBackup, importDatabaseBackup } from '../utils/backup';
import fs from 'fs';

// Get all settings
export const getSettings = async (req: Request, res: Response) => {
  try {
    const settings = await prisma.settings.findMany();
    
    // Convert array to key-value object
    const settingsMap = settings.reduce((acc: any, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    res.status(200).json(settingsMap);
  } catch (error: any) {
    console.error('Error in getSettings:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat mengambil pengaturan', error: error.message });
  }
};

// Update system settings
export const updateSettings = async (req: Request, res: Response) => {
  try {
    const settingsObj = req.body; // e.g. { activeEventId: "abc", customTheme: "dark" }

    const promises = Object.keys(settingsObj).map((key) => {
      return prisma.settings.upsert({
        where: { key },
        update: { value: String(settingsObj[key]) },
        create: { key, value: String(settingsObj[key]) }
      });
    });

    await Promise.all(promises);

    res.status(200).json({ message: 'Pengaturan berhasil disimpan' });
  } catch (error: any) {
    console.error('Error in updateSettings:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat menyimpan pengaturan', error: error.message });
  }
};

// Download Database Backup JSON
export const backupDatabase = async (req: Request, res: Response) => {
  try {
    const backupData = await exportDatabaseBackup();
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Backup-Presensi-${Date.now()}.json`
    );

    res.status(200).send(JSON.stringify(backupData, null, 2));
  } catch (error: any) {
    console.error('Error in backupDatabase:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat backup database', error: error.message });
  }
};

// Restore Database Backup JSON
export const restoreDatabase = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'File backup JSON (.json) harus diupload!' });
    }

    const filePath = req.file.path;
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const backupJson = JSON.parse(fileContent);

    const result = await importDatabaseBackup(backupJson);

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.status(200).json({
      message: 'Database berhasil dipulihkan dari file backup',
      details: result
    });

  } catch (error: any) {
    console.error('Error in restoreDatabase:', error);
    // Cleanup if file exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Terjadi kesalahan saat memulihkan database', error: error.message });
  }
};
