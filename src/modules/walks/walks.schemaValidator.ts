import { validators, ValidationRule } from '../../utils/validation.util';
import { SLOT_DURATIONS } from '../../constants';

/**
 * Walks Module Validators (Custom Format)
 */
export const walksSchema = {
    // POST /api/v1/walks
    createWalk: {
        body: [
            { field: 'date', rules: [{ validator: validators.required, message: 'Date is required' }, { validator: (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v), message: 'Invalid date format (YYYY-MM-DD)' }] },
            { field: 'time', rules: [{ validator: validators.required, message: 'Time is required' }, { validator: (v: string) => /^\d{2}:\d{2}$/.test(v), message: 'Invalid time format (HH:mm)' }] },
            { field: 'duration', rules: [{ validator: validators.required, message: 'Duration is required' }, { validator: (v: any) => (SLOT_DURATIONS as unknown as number[]).includes(Number(v)), message: 'Invalid duration' }] }
        ]
    },

    // POST /api/v1/walks/book
    createBooking: {
        body: [
            { field: 'slot_id', rules: [{ validator: validators.required, message: 'Slot ID is required' }, { validator: validators.isUUID, message: 'Invalid Slot ID' }] },
            { field: 'notes', rules: [{ validator: (v: any) => !v || v.length <= 500, message: 'Notes too long' }] }
        ]
    },

    // POST /walks/:id/start
    startWalk: {
        body: [] as ValidationRule[]
    },

    // PATCH /walks/:id/metrics
    updateMetrics: {
        body: [
            { field: 'steps_count', rules: [{ validator: validators.required, message: 'Steps count is required' }, { validator: validators.isInteger, message: 'Must be an integer' }] },
            { field: 'distance_meters', rules: [{ validator: validators.required, message: 'Distance is required' }, { validator: validators.isPositive, message: 'Must be positive' }] },
            { field: 'latitude', rules: [{ validator: validators.required, message: 'Latitude is required' }] },
            { field: 'longitude', rules: [{ validator: validators.required, message: 'Longitude is required' }] }
        ]
    },

    // POST /walks/:id/complete
    completeWalk: {
        body: [
            { field: 'notes', rules: [{ validator: (v: any) => !v || v.length <= 500, message: 'Notes too long' }] }
        ]
    },

    // GET /walks/schedule/daily and weekly
    getSchedule: {
        query: [
            { field: 'date', rules: [{ validator: validators.required, message: 'Date is required' }, { validator: (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v), message: 'Invalid date format' }] },
            { field: 'nurse_id', rules: [{ validator: (v: any) => !v || validators.isUUID(v), message: 'Invalid Nurse ID' }] },
            { field: 'elderly_id', rules: [{ validator: (v: any) => !v || validators.isUUID(v), message: 'Invalid Elderly ID' }] }
        ]
    }
};
