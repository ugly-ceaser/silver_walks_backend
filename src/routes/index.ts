import { Router } from 'express';

const router = Router();

// Health check route (already handled in app.ts, but keeping for consistency)
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is healthy',
  });
});

// TODO: Import and mount module routes here
// Example:
// import authRoutes from '../modules/auth/auth.routes';
// router.use('/auth', authRoutes);

export default router;

