import { Router } from 'express';

const router = Router();

// Base route for roles
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Roles module base route'
  });
});

export default router;
