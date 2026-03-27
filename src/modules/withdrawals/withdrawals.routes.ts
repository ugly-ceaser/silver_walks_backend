import { Router } from 'express';

const router = Router();

// Base route for withdrawals
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Withdrawals module base route'
  });
});

export default router;
