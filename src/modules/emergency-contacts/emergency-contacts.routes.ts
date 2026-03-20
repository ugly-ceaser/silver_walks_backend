import { Router } from 'express';
import * as emergencyContactController from './emergency-contacts.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { validateRequest } from '../../middlewares/validation.middleware';
import { emergencyContactSchema } from './emergency-contacts.schemaValidator';
import { UserRole } from '../../models/User.model';

const router = Router();

// All emergency contact routes require authentication and ELDERLY role
router.use(authenticate, requireRole(UserRole.ELDERLY));

router.get('/', emergencyContactController.getAll);

router.post(
    '/',
    validateRequest(emergencyContactSchema.upsert),
    emergencyContactController.create
);

router.patch(
    '/:id',
    validateRequest(emergencyContactSchema.upsert),
    emergencyContactController.update
);

router.delete('/:id', emergencyContactController.remove);

router.patch('/:id/set-primary', emergencyContactController.setPrimary);

export default router;
