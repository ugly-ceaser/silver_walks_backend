import { validators } from '../../utils/validation.util';

/**
 * Health Profile Validators (Custom Format)
 */
export const healthProfileSchema = {
    // PUT /health-profiles/me
    updateProfile: {
        body: [
            { field: 'mobility_level', rules: [{ validator: validators.required, message: 'Mobility level is required' }, { validator: (v: any) => v >= 1 && v <= 5, message: 'Must be between 1 and 5' }] },
            { field: 'blood_type', rules: [{ validator: validators.required, message: 'Blood type is required' }, { validator: (v: any) => ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(v), message: 'Invalid blood type' }] },
            { field: 'doctor_phone', rules: [{ validator: (v: any) => !v || validators.isPhone(v), message: 'Invalid phone format' }] }
        ]
    },

    // PATCH /health-profiles/me/conditions
    patchConditions: {
        body: [
            { field: 'conditions', rules: [{ validator: validators.required, message: 'Conditions are required' }, { validator: (v: any) => Array.isArray(v) && v.length <= 20, message: 'Too many conditions' }] }
        ]
    },

    // PATCH /health-profiles/me/medications
    patchMedications: {
        body: [
            { field: 'medications', rules: [{ validator: validators.required, message: 'Medications are required' }, { validator: (v: any) => Array.isArray(v) && v.length <= 30, message: 'Too many medications' }] }
        ]
    }
};
