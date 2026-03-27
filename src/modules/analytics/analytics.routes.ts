import { Router } from 'express';

const router = Router();

// Base route for analytics
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Analytics module base route'
  });
});

export default router;
