import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const imageFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Format file tidak didukung. Hanya gambar (jpeg, jpg, png, webp, gif) yang diizinkan!'));
};

const excelFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedExts = /xlsx|xls|csv/;
  const extname = allowedExts.test(path.extname(file.originalname).toLowerCase());

  if (extname) {
    return cb(null, true);
  }
  cb(new Error('Format file tidak didukung. Hanya file Excel (.xlsx, .xls, .csv) yang diizinkan!'));
};

const jsonFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedExts = /json/;
  const extname = allowedExts.test(path.extname(file.originalname).toLowerCase());

  if (extname) {
    return cb(null, true);
  }
  cb(new Error('Format file tidak didukung. Hanya file backup JSON (.json) yang diizinkan!'));
};

export const upload = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB limits
  }
});

export const uploadExcel = multer({
  storage: storage,
  fileFilter: excelFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB limits
  }
});

export const uploadJSON = multer({
  storage: storage,
  fileFilter: jsonFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50 MB limits
  }
});
