import {EventEmitter} from 'events';
import {Adminizer} from '../Adminizer';
import {AbstractNotificationService} from "./AbstractNotificationService";
import {INotification} from '../../interfaces/types';
import {User} from "../../models/User";

export class NotificationHandler extends EventEmitter {
    private services: Map<string, AbstractNotificationService> = new Map();

    constructor() {
        super();
    }

    /**
     * Register a new notification service
     * @param service
     */
    registerService(service: AbstractNotificationService): void {
        this.services.set(service.notificationClass, service);
        Adminizer.log.info(`Notification service registered: ${service.notificationClass}`);
    }


    /**
     * Get a notification service by class
     * @param notificationClass
     */
    getService(notificationClass: string): AbstractNotificationService | undefined {
        return this.services.get(notificationClass);
    }

    /**
     * Get all registered services
     */
    getAllServices(): AbstractNotificationService[] {
        return Array.from(this.services.values());
    }

    /**
     * Dispatch a notification to a service
     * @param notificationClass
     * @param notification
     */
    async dispatchNotification(
        notificationClass: string,
        notification: Omit<INotification, 'id' | 'createdAt' | 'notificationClass' | 'icon'>
    ): Promise<boolean> {
        const service = this.getService(notificationClass);
        if (!service) {
            throw new Error(`Notification service not found: ${notificationClass}`);
        }
        return service.dispatchNotification(notification);
    }
}