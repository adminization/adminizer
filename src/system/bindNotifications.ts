import {Adminizer} from '../lib/Adminizer';
import {NotificationHandler} from '../lib/notifications/NotificationHandler';
import {GeneralNotificationService} from '../lib/notifications/GeneralNotificationService';
import {SystemNotificationService} from '../lib/notifications/SystemNotificationService';

export function bindNotifications(adminizer: Adminizer): void {
    // Create a handler
    adminizer.notificationHandler = new NotificationHandler();

    // Registering services
    // const systemService = new SystemNotificationService(adminizer);
    // adminizer.notificationHandler.registerService(systemService);

    if (adminizer.config.notifications.enableGeneral) {
        const generalService = new GeneralNotificationService(adminizer);
        adminizer.notificationHandler.registerService(generalService);
    }

}