import { EventEmitter } from 'events';
import { logger } from './logger.util';

class AppEventEmitter extends EventEmitter { }

const appEvents = new AppEventEmitter();

// Log all event emissions in development
if (process.env.NODE_ENV === 'development') {
    const originalEmit = appEvents.emit;
    appEvents.emit = function (event: string | symbol, ...args: any[]) {
        logger.debug(`[Event Emitted] ${String(event)}`, { args });
        return originalEmit.apply(this, [event, ...args]);
    };
}

export default appEvents;

// Define Event Names Constants
export const APP_EVENTS = {
    BOOKING: {
        CONFIRMED: 'booking.confirmed',
        CANCELLED: 'booking.cancelled',
    },
    WALK: {
        STARTED: 'walk.started',
        COMPLETED: 'walk.completed',
    }
};
