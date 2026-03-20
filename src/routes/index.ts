import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import walkRoutes from '../modules/walks/walks.routes';
import adminRoutes from '../modules/admin/admin.routes';
import healthProfileRoutes from '../modules/health-profiles/health-profiles.routes';
import emergencyContactRoutes from '../modules/emergency-contacts/emergency-contacts.routes';
import nurseRoutes from '../modules/nurses/nurses.routes';
import elderlyRoutes from '../modules/elderly/elderly.routes';

const router = Router();

// API Info route
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Silver Walks API',
      description: 'A comprehensive platform connecting elderly individuals with professional nurses for safe walking sessions',
      version: 'v1',
      status: 'active',
      developers: [
        {
          name: 'Ugly Ceaser',
          role: 'Backend Developer'
        },
        {
          name: 'Kesther',
          role: 'Backend Developer'
        },
        {
          name: 'Izumi',
          role: 'Backend Developer'
        },
        {
          name: 'Grace',
          role: 'Frontend Developer'
        },
        {
          name: 'Gladys',
          role: 'Frontend Developer'
        },
        {
          name: 'Ogo',
          role: 'Frontend Developer'
        },
        {
          name: 'Zara',
          role: 'Product Manager'
        },
        {
          name: 'Ella',
          role: 'Product Designer'
        },
        {
          name: 'Favour',
          role: 'Product Designer'
        }
      ],
      features: [
        'User Authentication & Authorization',
        'Walk Session Management',
        'Real-time Emergency Alerts',
        'Payment Processing',
        'Subscription Plans',
        'Activity Tracking',
        'Health Profile Management',
        'Notification System'
      ],
      endpoints: {
        auth: '/api/v1/auth',
        health: '/api/v1/health'
      },
      documentation: 'https://github.com/ugly-ceaser/silver_walks_backend',
      contact: {
        github: 'https://github.com/ugly-ceaser'
      }
    }
  });
});

// Health check route
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString()
  });
});



router.use('/auth', authRoutes);
router.use('/walks', walkRoutes);
router.use('/admin', adminRoutes);
router.use('/health-profiles', healthProfileRoutes);
router.use('/emergency-contacts', emergencyContactRoutes);
router.use('/nurses', nurseRoutes);
router.use('/elderly', elderlyRoutes);

export default router;
