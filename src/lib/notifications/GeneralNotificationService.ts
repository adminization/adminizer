import {AbstractNotificationService} from './AbstractNotificationService';
import {INotification, INotificationEvent} from '../../interfaces/types';
import {Adminizer} from '../Adminizer';
import {NotificationAPModel} from "../../models/NotificationAP";

export class GeneralNotificationService extends AbstractNotificationService {
    public readonly notificationClass = 'general';
    public readonly displayName: string = 'General';
    public readonly icon: string = 'info'
    public readonly iconColor: string = '#5987de';

    async dispatchNotification(notification: Omit<INotification, 'id' | 'createdAt' | 'notificationClass' | 'icon'>): Promise<boolean> {
        const fullNotification: Omit<INotification, 'id' | 'createdAt' | 'icon'> = {
            ...notification,
            notificationClass: this.notificationClass
        };

        let notificationDB: NotificationAPModel;
        // Save to the database
        if (this.adminizer.modelHandler.model.has('notificationap')) {
            try {
                notificationDB = await this.adminizer.modelHandler.model.get('notificationap')["_create"](fullNotification);

                if (notification.userId) {
                    // For specific user
                    await this.createUserNotification(notificationDB.id, notification.userId);
                } else {
                    // For all users
                    const users = await this.adminizer.modelHandler.model.get('userap')["_find"]({});
                    for (const user of users) {
                        try {
                            if (this.adminizer.accessRightsHelper.hasPermission(`notification-${this.notificationClass}`, user)) {
                                await this.createUserNotification(notificationDB.id, user.id);
                            } else {
                                Adminizer.log.error(`[${this.notificationClass}] User ${user.id} doesn't have permission to receive this notification`)
                            }
                        } catch (error) {
                            Adminizer.log.error('Error creating UserNotificationAP:', error);
                        }
                    }
                }

                const event: INotificationEvent = {
                    type: 'notification',
                    data: {
                        ...notificationDB,
                        read: false,
                        icon: {
                            icon: this.icon,
                            iconColor: this.iconColor
                        },
                    } as INotification,
                    notificationClass: this.notificationClass,
                    userId: notification.userId ?? null
                };
                this.broadcast(event);
                Adminizer.log.info(`[General] Notification dispatched: ${fullNotification.title}`);
                return true;

            } catch (error) {
                Adminizer.log.error('Error saving notification to database:', error);
            }
        }

        return false;
    }
}