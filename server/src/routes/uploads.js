import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import { config } from '../config.js';
import { newId } from '../utils/ids.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 10);
    cb(null, `${newId()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();
router.use(requireAuth);

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) throw new ApiError(400, 'No file uploaded');
  res.status(201).json({ file_url: `/uploads/${req.file.filename}` });
});

export default router;
