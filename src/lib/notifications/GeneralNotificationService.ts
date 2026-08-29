import {AbstractNotificationService} from './AbstractNotificationService';
import {INotification, INotificationEvent} from '../../interfaces/types';
import {Adminizer} from '../Adminizer';
import {NotificationModel} from "../../models/Notification";

export class GeneralNotificationService extends AbstractNotificationService {
    public readonly notificationClass = 'general';
    public readonly displayName: string = 'General';
    public readonly icon: string = 'info'
    public readonly iconColor: string = '#5987de';

    async dispatchNotification(notification: Omit<INotification, 'id' | 'createdAt' | 'notificationClass' | 'icon'>): Promise<boolean> {
        const { userId, ...notificationData } = notification;

        const fullNotification: Omit<INotification, 'id' | 'createdAt' | 'icon'> = {
            ...notificationData,
            notificationClass: this.notificationClass
        };

        let notificationDB: NotificationModel;
        try {
            notificationDB = await this.notificationModel().create(fullNotification);

            if (userId) {
                // For specific user
                await this.createUserNotification(notificationDB.id, userId);
            } else {
                // For all users
                const users = await this.userModel().find({});
                for (const user of users) {
                    try {
                        if (await this.adminizer.accessRightsHelper.checkPermission(`notification-${this.notificationClass}`, user)) {
                            await this.createUserNotification(notificationDB.id, user.id);
                        } else {
                            Adminizer.log.warn(`[${this.notificationClass}] User ${user.id} doesn't have permission to receive this notification`)
                        }
                    } catch (error) {
                        Adminizer.log.error('Error creating UserNotification:', error);
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
                userId: userId ?? null
            };
            this.broadcast(event);
            Adminizer.log.info(`[General] Notification dispatched: ${fullNotification.title}`);
            return true;

        } catch (error) {
            Adminizer.log.error('Error saving notification to database:', error);
        }

        return false;
    }
}
