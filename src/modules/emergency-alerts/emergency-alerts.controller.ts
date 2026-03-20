import { Request, Response, NextFunction } from 'express';
import { emergencyAlertService } from './emergency-alerts.service';
import { successResponse } from '../../utils/response.util';
import { AlertType, AlertSeverity } from '../../models/EmergencyAlert.model';

/**
 * Emergency Alerts Controller
 */
export const emergencyAlertsController = {
    /**
     * Trigger an SOS alert
     */
    async trigger(req: Request, res: Response, next: NextFunction) {
        try {
            const elderlyId = (req as any).user.profile?.id || (req as any).user.id; 
            // Note: In a real system, we'd ensure the request is coming from an elderly user.
            
            const alert = await emergencyAlertService.triggerAlert(elderlyId, {
                alert_type: req.body.alert_type as AlertType,
                severity: req.body.severity as AlertSeverity,
                description: req.body.description,
                location_data: req.body.location_data,
                walk_session_id: req.body.walk_session_id
            });

            return successResponse(res, alert, 'Emergency alert triggered successfully');
        } catch (error) {
            next(error);
        }
    },

    /**
     * Resolve an alert
     */
    async resolve(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const resolvedBy = (req as any).user.id;

            const result = await emergencyAlertService.resolveAlert(id, resolvedBy);
            return successResponse(res, result, 'Emergency alert resolved successfully');
        } catch (error) {
            next(error);
        }
    }
};
