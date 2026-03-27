import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import walkRoutes from '../modules/walks/walks.routes';
import adminRoutes from '../modules/admin/admin.routes';
import healthProfileRoutes from '../modules/health-profiles/health-profiles.routes';
import emergencyContactRoutes from '../modules/emergency-contacts/emergency-contacts.routes';
import nurseRoutes from '../modules/nurses/nurses.routes';
import elderlyRoutes from '../modules/elderly/elderly.routes';
import notificationRoutes from '../modules/notifications/notifications.routes';
import emergencyAlertRoutes from '../modules/emergency-alerts/emergency-alerts.routes';
import ratingsRoutes from '../modules/ratings/ratings.routes';
import activityRoutes from '../modules/activities/activities.routes';
import userRoutes from '../modules/users/users.routes';
import roleRoutes from '../modules/roles/roles.routes';
import subscriptionRoutes from '../modules/subscriptions/subscriptions.routes';
import paymentRoutes from '../modules/payments/payments.routes';
import withdrawalRoutes from '../modules/withdrawals/withdrawals.routes';
import bankAccountRoutes from '../modules/bank-accounts/bank-accounts.routes';
import analyticsRoutes from '../modules/analytics/analytics.routes';

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
        { name: 'Ugly Ceaser', role: 'Backend Developer' },
        { name: 'Kesther', role: 'Backend Developer' },
        { name: 'Izumi', role: 'Backend Developer' },
        { name: 'Grace', role: 'Frontend Developer' },
        { name: 'Gladys', role: 'Frontend Developer' },
        { name: 'Ogo', role: 'Frontend Developer' },
        { name: 'Zara', role: 'Product Manager' },
        { name: 'Ella', role: 'Product Designer' },
        { name: 'Favour', role: 'Product Designer' }
      ],
      features: [
        'User Authentication & RBAC',
        'Walk Session Management & Real-time Tracking',
        'Comprehensive Health Profile Monitoring',
        'Emergency Alert & Contact Management',
        'Multi-channel Notification System (Push, Email, SMS)',
        'Payment Processing & Subscription Management',
        'Nurse & Elderly Onboarding & Verification',
        'Point-based Rewards & Withdrawal System',
        'Advanced Analytics & Activity Logging',
        'Admin Management Dashboard'
      ],
      endpoints: {
        auth: '/api/v1/auth',
        users: '/api/v1/users',
        roles: '/api/v1/roles',
        elderly: '/api/v1/elderly',
        nurses: '/api/v1/nurses',
        walks: '/api/v1/walks',
        health_profiles: '/api/v1/health-profiles',
        emergency_contacts: '/api/v1/emergency-contacts',
        emergency_alerts: '/api/v1/emergency-alerts',
        notifications: '/api/v1/notifications',
        subscriptions: '/api/v1/subscriptions',
        payments: '/api/v1/payments',
        withdrawals: '/api/v1/withdrawals',
        bank_accounts: '/api/v1/bank-accounts',
        ratings: '/api/v1/ratings',
        activities: '/api/v1/activities',
        analytics: '/api/v1/analytics',
        admin: '/api/v1/admin',
        health_check: '/api/v1/health'
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

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/elderly', elderlyRoutes);
router.use('/nurses', nurseRoutes);
router.use('/walks', walkRoutes);
router.use('/health-profiles', healthProfileRoutes);
router.use('/emergency-contacts', emergencyContactRoutes);
router.use('/emergency-alerts', emergencyAlertRoutes);
router.use('/notifications', notificationRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/payments', paymentRoutes);
router.use('/withdrawals', withdrawalRoutes);
router.use('/bank-accounts', bankAccountRoutes);
router.use('/ratings', ratingsRoutes);
router.use('/activities', activityRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/admin', adminRoutes);

export default router;

