import { validators } from '../../utils/validation.util';

/**
 * Emergency Contact Validators (Custom Format)
 */
export const emergencyContactSchema = {
    // POST /emergency-contacts and PATCH /emergency-contacts/:id
    upsert: {
        body: [
            { field: 'name', rules: [{ validator: validators.required, message: 'Name is required' }] },
            { field: 'relationship', rules: [{ validator: validators.required, message: 'Relationship is required' }] },
            { field: 'phone', rules: [{ validator: validators.required, message: 'Phone is required' }, { validator: validators.isPhone, message: 'Invalid phone format' }] },
            { field: 'email', rules: [{ validator: validators.email, message: 'Invalid email format' }] }
        ]
    }
};
