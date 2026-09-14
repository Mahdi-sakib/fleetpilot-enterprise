import { Router } from 'express';

const router = Router();

// Kept for compatibility with the client's app-state bootstrap check.
router.get('/public-settings', (_req, res) => {
  res.json({ id: 'app', public_settings: {} });
});

export default router;
