import {AbstractNotificationService} from './AbstractNotificationService';
import {INotification, INotificationEvent} from '../../interfaces/types';
import {Adminizer} from '../Adminizer';
import {NotificationModel} from "../../models/Notification";
import {User} from "../../models/User";

export class SystemNotificationService extends AbstractNotificationService {
    public readonly notificationClass = 'system';
    public readonly displayName: string = 'System';
    public readonly icon: string = 'settings'
    public readonly iconColor: string = '#1eb707';

    // We change the channel structure: store by userId -> channel -> clientIds
    private crudChannels: Map<number, Map<string, Set<string>>> = new Map();

    async dispatchNotification(notification: Omit<INotification, 'id' | 'createdAt' | 'notificationClass' | 'icon'>): Promise<boolean> {
        const fullNotification: Omit<INotification, 'id' | 'createdAt' | 'icon'> = {
            ...notification,
            notificationClass: this.notificationClass,
            channel: notification.channel ?? ''
        };

        let notificationDB: NotificationModel;
        try {
            notificationDB = await this.notificationModel().create(fullNotification);

            const users = await this.userModel().find({}) as User[];
            for (const user of users) {
                try {
                    if (await this.adminizer.accessRightsHelper.hasPermission(`notification-${this.notificationClass}`, user)) {
                        await this.createUserNotification(notificationDB.id, user.id);
                    }
                } catch (error) {
                    Adminizer.log.error('Error creating UserNotification:', error);
                }
            }

            const event: INotificationEvent = {
                type: 'notification',
                data: {
                    ...notificationDB,
                    icon: {
                        icon: this.icon,
                        iconColor: this.iconColor
                    },
                } as INotification,
                notificationClass: this.notificationClass,
                userId: notification.userId ?? null,
                channel: notification.channel ?? 'system'
            };

            // Send to all channels or to a specific channel
            if (notification.channel) {
                this.broadcastToChannel(notification.channel, event);
            } else {
                this.broadcastToChannel('system', event);
            }

            Adminizer.log.info(`[System] Notification dispatched: ${fullNotification.title}`);
            return true;

        } catch (error) {
            Adminizer.log.error('Error saving system notification to database:', error);
        }

        return false;
    }

    // Updating broadcastToChannel to work with the new structure
    private broadcastToChannel(channel: string, event: INotificationEvent): void {
        // Sent to all users subscribed to this channel
        this.crudChannels.forEach((userChannels, userId) => {
            const channelClients = userChannels.get(channel);
            if (channelClients) {
                const userClients = this.clients.get(userId);
                if (userClients) {
                    channelClients.forEach(clientId => {
                        const sendFn = userClients.get(clientId);
                        if (sendFn) {
                            try {
                                sendFn(event);
                            } catch (error) {
                                Adminizer.log.error(`[${this.notificationClass}] Error sending to client ${clientId} on channel ${channel}:`, error);
                                this.removeClient(clientId);
                            }
                        }
                    });
                }
            }
        });
    }

    // Adding a client to a channel linked to a user
    addClientToChannel(clientId: string, channel: string, userId: number): void {
        if (!this.crudChannels.has(userId)) {
            this.crudChannels.set(userId, new Map());
        }

        const userChannels = this.crudChannels.get(userId)!;
        if (!userChannels.has(channel)) {
            userChannels.set(channel, new Set());
        }

        userChannels.get(channel)!.add(clientId);
        Adminizer.log.info(`[${this.notificationClass}] Client ${clientId} (user ${userId}) added to channel ${channel}`);
    }

    // Removing a client from a specific user's channel
    removeClientFromChannel(clientId: string, channel: string, userId: number): void {
        const userChannels = this.crudChannels.get(userId);
        if (userChannels) {
            const channelClients = userChannels.get(channel);
            if (channelClients) {
                channelClients.delete(clientId);
                Adminizer.log.info(`[${this.notificationClass}] Client ${clientId} (user ${userId}) removed from channel ${channel}`);

                // If there are no more clients in the channel, delete the channel
                if (channelClients.size === 0) {
                    userChannels.delete(channel);
                }
            }

            // If the user no longer has channels, delete the user's entry
            if (userChannels.size === 0) {
                this.crudChannels.delete(userId);
            }
        }
    }

    // We remove the client from all user channels
    removeClientFromAllChannels(clientId: string, userId: number): void {
        const userChannels = this.crudChannels.get(userId);
        if (userChannels) {
            userChannels.forEach((clients, channel) => {
                clients.delete(clientId);
                Adminizer.log.info(`[${this.notificationClass}] Client ${clientId} (user ${userId}) removed from channel ${channel}`);

                // If there are no more clients in the channel, delete the channel
                if (clients.size === 0) {
                    userChannels.delete(channel);
                }
            });

            // If the user no longer has channels, delete the user's entry
            if (userChannels.size === 0) {
                this.crudChannels.delete(userId);
            }
        }
    }

    // Overriding removeClient to clear channels
    removeClient(clientId: string): void {
        // Find userId by clientId
        let foundUserId: number | null = null;
        for (const [userId, userClients] of this.clients.entries()) {
            if (userClients.has(clientId)) {
                foundUserId = userId;
                break;
            }
        }

        // Removing the client from the main storage
        super.removeClient(clientId);

        // Removing a client from channels
        if (foundUserId !== null) {
            this.removeClientFromAllChannels(clientId, foundUserId);
        }
    }

    // Special method for system events specifying the channel
    async logSystemEvent(title: string, message: string, channel?: string, metadata?: Record<string | number, any>): Promise<boolean> {
        return this.dispatchNotification({
            title: title,
            message: message,
            metadata: metadata,
            channel: channel
        });
    }

    // Methods for CRUD operations
    async logCreatedEvent(title: string, message: string, metadata?: Record<string | number, any>): Promise<boolean> {
        return this.logSystemEvent(title, message, 'created', metadata);
    }

    async logUpdatedEvent(title: string, message: string, metadata?: Record<string | number, any>): Promise<boolean> {
        return this.logSystemEvent(title, message, 'updated', metadata);
    }

    async logDeletedEvent(title: string, message: string, metadata?: Record<string | number, any>): Promise<boolean> {
        return this.logSystemEvent(title, message, 'deleted', metadata);
    }

    // New method to get user channels
    getUserChannels(userId: number): Map<string, Set<string>> {
        return this.crudChannels.get(userId) || new Map();
    }
}
