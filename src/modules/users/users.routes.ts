import { Router } from 'express';

const router = Router();

// Base route for users
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Users module base route'
  });
});

export default router;
