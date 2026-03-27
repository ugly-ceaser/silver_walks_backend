import { Router } from 'express';

const router = Router();

// Base route for payments
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Payments module base route'
  });
});

export default router;
