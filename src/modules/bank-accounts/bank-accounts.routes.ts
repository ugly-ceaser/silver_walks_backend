import { Router } from 'express';

const router = Router();

// Base route for bank accounts
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Bank Accounts module base route'
  });
});

export default router;
