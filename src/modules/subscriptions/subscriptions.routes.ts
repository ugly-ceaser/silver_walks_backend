import { Router } from 'express';

const router = Router();

// Base route for subscriptions
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Subscriptions module base route'
  });
});

export default router;
