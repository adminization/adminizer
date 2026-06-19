import {EventEmitter} from 'events';
import {Adminizer} from '../Adminizer';
import {INotification, INotificationEvent} from '../../interfaces/types';
import {NotificationModel} from "../../models/Notification";
import {User} from "../../models/User";
import {UserNotification} from "../../models/UserNotification";


/**
 * ░█████╗░██████╗░░██████╗████████╗██████╗░░█████╗░░█████╗░████████╗
 * ██╔══██╗██╔══██╗██╔════╝╚══██╔══╝██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝
 * ███████║██████╦╝╚█████╗░░░░██║░░░██████╔╝███████║██║░░╚═╝░░░██║░░░
 * ██╔══██║██╔══██╗░╚═══██╗░░░██║░░░██╔══██╗██╔══██║██║░░██╗░░░██║░░░
 * ██║░░██║██████╦╝██████╔╝░░░██║░░░██║░░██║██║░░██║╚█████╔╝░░░██║░░░
 * ╚═╝░░╚═╝╚═════╝░╚═════╝░░░░╚═╝░░░╚═╝░░╚═╝╚═╝░░╚═╝░╚════╝░░░░╚═╝░░░
 *
 * ███╗░░██╗░█████╗░████████╗██╗███████╗██╗░█████╗░░█████╗░████████╗██╗░█████╗░███╗░░██╗
 * ████╗░██║██╔══██╗╚══██╔══╝██║██╔════╝██║██╔══██╗██╔══██╗╚══██╔══╝██║██╔══██╗████╗░██║
 * ██╔██╗██║██║░░██║░░░██║░░░██║█████╗░░██║██║░░╚═╝███████║░░░██║░░░██║██║░░██║██╔██╗██║
 * ██║╚████║██║░░██║░░░██║░░░██║██╔══╝░░██║██║░░██╗██╔══██║░░░██║░░░██║██║░░██║██║╚████║
 * ██║░╚███║╚█████╔╝░░░██║░░░██║██║░░░░░██║╚█████╔╝██║░░██║░░░██║░░░██║╚█████╔╝██║░╚███║
 * ╚═╝░░╚══╝░╚════╝░░░░╚═╝░░░╚═╝╚═╝░░░░░╚═╝░╚════╝░╚═╝░░╚═╝░░░╚═╝░░░╚═╝░╚════╝░╚═╝░░╚══╝
 *
 * Class: AbstractNotificationService
 *
 * Description:
 * The `AbstractNotificationService` is a base class that provides the fundamental structure and functionality
 * for implementing notification services in the application. It manages client connections, dispatches notifications,
 * tracks user notification status, and handles database interactions for storing and retrieving notification data.
 * This abstract class is intended to be extended by concrete notification service implementations.
 *
 * Key Features:
 * - Manages a registry of clients associated with users using a nested Map structure.
 * - Provides methods to add, remove, and retrieve clients.
 * - Dispatches notifications to connected clients via an abstract method to be implemented by subclasses.
 * - Sends heartbeat (ping) messages to keep client connections alive.
 * - Creates and retrieves user notification records in the database.
 * - Fetches paginated and filtered notification lists for a specific user.
 * - Supports searching notifications by message content.
 * - Marks notifications as read or all notifications as read for a user.
 * - Emits events using Node.js EventEmitter for extensibility and integration.
 *
 * Usage Example:
 * Subclasses should override the `dispatchNotification` method to implement custom notification logic.
 *
 * @abstract
 * @extends EventEmitter
 * @property {Map<number, Map<string, Function>>} clients - A map of user IDs to their client maps.
 * @property {Adminizer} adminizer - Reference to the Adminizer instance for accessing helpers and models.
 * @property {string} notificationClass - Abstract property representing the class name of the notification.
 * @property {string} icon - Abstract property for the notification icon.
 * @property {string} iconColor - Abstract property for the notification icon color.
 */
export abstract class AbstractNotificationService extends EventEmitter {
    protected clients: Map<number, Map<string, (event: INotificationEvent) => void>> = new Map();
    protected adminizer: Adminizer;
    public abstract readonly notificationClass: string;
    public abstract readonly displayName: string;
    public abstract readonly icon: string;
    public abstract readonly iconColor: string;

    constructor(adminizer: Adminizer) {
        super();
        this.adminizer = adminizer;
        this._bindAccessRight()
    }

    protected notificationModel() {
        return this.adminizer.modelHandler.internal("notifications").get<any>("Notification");
    }

    protected userNotificationModel() {
        return this.adminizer.modelHandler.internal("notifications").get<any>("UserNotification");
    }

    protected userModel() {
        return this.adminizer.modelHandler.internal("notifications").get<User>("User");
    }

    private _bindAccessRight() {
        setTimeout(() => {
            this.adminizer.accessRightsHelper.registerToken({
                id: `notification-${this.notificationClass}`,
                name: this.notificationClass,
                description: `Access to notification ${this.notificationClass}`,
                department: 'notification',
            });
        }, 100)
    }

    /**
     * Registers a client for a user and associates it with a send function.
     * If the user does not yet have a Map of clients, one is created.
     * The client is then added to the user's Map with the provided send function.
     * @param {string} clientId - The unique identifier of the client to be registered.
     * @param {(event: INotificationEvent) => void} sendFn - The function used to send notifications to the client.
     * @param {User} user - The user associated with the client.
     */
    addClient(clientId: string, sendFn: (event: INotificationEvent) => void, user: User): void {
        const userId = user.id;

        // If the user does not yet have Map clients, create one
        if (!this.clients.has(userId)) {
            this.clients.set(userId, new Map());
        }

        // We get the Map of the user's clients and add a new client
        const userClients = this.clients.get(userId)!;
        userClients.set(clientId, sendFn);
    }


    /**
     * Removes a client from the internal tracking structure.
     * If the user associated with the client has no more clients after removal, the user's Map is also removed.
     * @param {string} clientId - The unique identifier of the client to be removed.
     */
    removeClient(clientId: string): void {
        // We are looking for a client in all custom Maps
        for (const [userId, userClients] of this.clients.entries()) {
            if (userClients.has(clientId)) {
                userClients.delete(clientId);

                // If the user no longer has clients, delete his Map
                if (userClients.size === 0) {
                    this.clients.delete(userId);
                }

                return;
            }
        }

        Adminizer.log.warn(`[${this.notificationClass}] Client ${clientId} not found for removal`);
    }

    /**
     * Retrieves the Map of clients associated with a specific user.
     * If the user has no clients, an empty Map is returned.
     * @param {number} userId - The unique identifier of the user whose clients should be retrieved.
     * @returns {Map<string, (event: INotificationEvent) => void>} A Map where the keys are client IDs and the values are send functions.
     */
    getUserClients(userId: number): Map<string, (event: INotificationEvent) => void> {
        return this.clients.get(userId) || new Map();
    }

    /**
     * Returns the total number of users who have at least one connected client.
     * @returns {number} The count of users with active clients.
     */
    getClientCount(): number {
        return this.clients.size;
    }

    /**
     * Aggregates all clients from all users into a single Map for backward compatibility.
     * Each client is uniquely identified by its ID and mapped to its corresponding send function.
     * @returns {Map<string, (event: INotificationEvent) => void>} A combined Map of all client IDs and their send functions.
     */
    getAllClients(): Map<string, (event: INotificationEvent) => void> {
        const allClients = new Map();
        for (const userClients of this.clients.values()) {
            for (const [clientId, sendFn] of userClients.entries()) {
                allClients.set(clientId, sendFn);
            }
        }
        return allClients;
    }


    /**
     * Abstract method that must be implemented by subclasses to dispatch a notification.
     * @param {Omit<INotification, 'id' | 'createdAt' | 'notificationClass' | 'icon'>} notification - The notification data to be dispatched (excluding id, createdAt, notificationClass, and icon).
     * @returns {Promise<boolean>} A promise that resolves to a boolean indicating whether the notification was successfully dispatched.
     */
    abstract dispatchNotification(notification: Omit<INotification, 'id' | 'createdAt' | 'notificationClass' | 'icon'>): Promise<boolean>;

    /**
     * Sends a notification event to all connected clients.
     * Iterates through each user's client Map and invokes the send function for each client.
     * If sending fails, logs an error and removes the client.
     * @param {INotificationEvent} event - The notification event to broadcast.
     */
    protected broadcast(event: INotificationEvent): void {
        for (const userClients of this.clients.values()) {
            userClients.forEach((sendFn, clientId) => {
                try {
                    sendFn(event);
                } catch (error) {
                    Adminizer.log.error(`[${this.notificationClass}] Error sending to client ${clientId}:`, error);
                    this.removeClient(clientId);
                }
            });
        }
    }

    /**
     * Sends a heartbeat (ping) message to a specific client.
     * Searches for the client across all user client Maps and sends a heartbeat event if found.
     * @param {string} clientId - The unique identifier of the client to receive the heartbeat.
     */
    sendHeartbeat(clientId: string): void {
        for (const userClients of this.clients.values()) {
            const sendFn = userClients.get(clientId);
            if (sendFn) {
                const heartbeatEvent: INotificationEvent = {
                    type: 'heartbeat',
                    data: 'ping'
                };
                sendFn(heartbeatEvent);
                return;
            }
        }
    }

    /**
     * Creates a new user notification record in the 'UserNotification' model.
     * This method is used to associate a notification with a specific user and mark it as unread.
     * @param {string} notificationId - The unique identifier of the notification.
     * @param {number} [userId] - The ID of the user to associate the notification with. Optional.
     * @returns {Promise<void>} A promise that resolves when the record is created or an error is logged.
     */
    protected async createUserNotification(notificationId: string, userId?: number): Promise<void> {
        if (userId) {
            try {
                await this.userNotificationModel().create({
                    userId: userId,
                    notificationId: notificationId,
                    read: false
                });
            } catch (error) {
                Adminizer.log.error(`Error creating user notification record:`, error);
            }
        }
    }

    /**
     * Retrieves a user notification record from the 'UserNotification' model.
     * The record is fetched based on the provided notification ID and user ID.
     * @param {string} notificationId - The unique identifier of the notification.
     * @param {number} userId - The ID of the user associated with the notification.
     * @returns {Promise<any>} A promise that resolves with the found record or null if not found or an error occurs.
     */
    protected async getUserNotification(notificationId: string, userId: number): Promise<any> {
        try {
            return await this.userNotificationModel().findOne({
                where: {notificationId: notificationId, userId: userId}
            });
        } catch (error) {
            Adminizer.log.error(`Error getting user notification:`, error);
            return null;
        }
    }

    /**
     * Retrieves a paginated list of notifications for a specific user, optionally filtered by read status.
     * @param {number} userId - The ID of the user whose notifications should be fetched.
     * @param {number} [limit=20] - The maximum number of notifications to return.
     * @param {number} [skip=0] - The number of notifications to skip (used for pagination).
     * @param {boolean} [unreadOnly=false] - Whether to return only unread notifications.
     * @returns {Promise<INotification[]>} A promise that resolves with an array of notification objects.
     */
    async getNotifications(userId: number, limit: number = 20, skip: number = 0, unreadOnly: boolean = false): Promise<INotification[]> {
        try {
            let query: any = {notificationClass: this.notificationClass};

            // If notifications are requested for a specific user, we obtain the user's notification ID
            const userNotifications = await this.userNotificationModel().find({
                where: {
                    userId: userId
                },
                populate: {notificationId: true}
            });

            const notificationIds = userNotifications.map((un: any) => un.notificationId.id);

            if (unreadOnly) {
                // Only unread
                query.id = userNotifications
                    .filter((un: any) => !un.read)
                    .map((un: any) => un.notificationId.id);
            } else {
                query.id = notificationIds;
            }

            if (query.id.length === 0) return []

            const notificationsDB: NotificationModel[] = await this.notificationModel().find({
                where: query,
                sort: 'createdAt DESC',
                limit: limit,
                skip: skip
            });

            return await this.prepareNotification(notificationsDB, userId);

        } catch (error) {
            Adminizer.log.error('Error fetching notifications:', error);
            return [];
        }
    }

    /**
     * Prepares notification data by enriching it with user-specific read status and icon information.
     * @param {NotificationModel[]} notificationsDB - An array of raw notification records from the database.
     * @param {number} userId - The ID of the user for whom the read status is determined.
     * @returns {Promise<INotification[]>} A promise that resolves with an array of enriched notification objects.
     */
    protected async prepareNotification(notificationsDB: NotificationModel[], userId: number): Promise<INotification[]> {
        let notifications: INotification[] = [];

        for (const notification of notificationsDB) {
            let readStatus = false;

            // Getting read status from UserNotification
            const userNotification = await this.getUserNotification(notification.id, userId);
            readStatus = userNotification ? userNotification.read : false;

            notifications.push({
                ...notification,
                read: readStatus,
                icon: {
                    icon: this.icon,
                    iconColor: this.iconColor
                },
            });
        }

        return notifications;
    }

    /**
     * Searches for notifications for a specific user based on a message keyword.
     * @param {string} s - The search string used to filter notifications by message content.
     * @param {number} userId - The ID of the user whose notifications should be searched.
     * @returns {Promise<INotification[]>} A promise that resolves with an array of matching notification objects.
     */
    async search(s: string, userId: number): Promise<INotification[]> {
        try {
            const userNotifications = await this.userNotificationModel().find({
                where: {
                    userId: userId
                },
                populate: {notificationId: true}
            });

            const notificationIds = userNotifications.map((un: any) => un.notificationId.id);

            if (notificationIds.length === 0) return []

            const notificationsDB: NotificationModel[] = await this.notificationModel().find({
                where: {
                    message: {contains: s},
                    id: notificationIds,
                    notificationClass: this.notificationClass
                },
                sort: "createdAt DESC"
            });

            return await this.prepareNotification(notificationsDB, userId);
        } catch (error) {
            Adminizer.log.error('Error searching notifications:', error);
            return [];
        }
    }

    /**
     * Marks a specific notification as read for a given user.
     * @param {number} userId - The ID of the user for whom the notification should be marked as read.
     * @param {string} id - The ID of the notification to mark as read.
     * @returns {Promise<void>} A promise that resolves when the operation is complete.
     */
    async markAsRead(userId: number, id: string): Promise<void> {
        try {
            const userNotification = await this.getUserNotification(id, userId);
            if (userNotification) {
                await this.userNotificationModel().update({
                    where: {id: userNotification.id}
                }, {read: true});
            }
        } catch (error) {
            Adminizer.log.error('Error marking notification as read:', error);
        }
    }

    /**
     * Marks all notifications as read for a given user.
     * @param {number} userId - The ID of the user for whom all notifications should be marked as read.
     * @returns {Promise<void>} A promise that resolves when the operation is complete.
     */
    async markAllAsRead(userId: number): Promise<void> {
        try {
            const userNotifications = await this.userNotificationModel().find({
                where: {userId: userId}
            });
            for (const userNotification of userNotifications) {
                await this.userNotificationModel().update({
                    where: {id: userNotification.id},
                }, {read: true});
            }
        } catch (error) {
            Adminizer.log.error('Error marking all notifications as read:', error);
        }
    }

       /**
     * Returns the count of user notifications: all notifications or only unread ones.
     * If unreadOnly is true, returns the number of unread notifications.
     * If unreadOnly is false, returns the total number of notifications (read + unread) associated with the user.
     *
     * @param {number} userId - The ID of the user whose notification count is requested.
     * @param {boolean} [unreadOnly=false] - If true, counts only unread notifications; if false, counts all notifications.
     * @returns {Promise<number>} A promise that resolves with the number of matching notifications.
     *
     * @example
     * const total = await service.getNotificationsCount(123); // all notifications
     * const unreadCount = await service.getNotificationsCount(123, true); // only unread
     */
    async getNotificationsCount(userId: number, unreadOnly: boolean = false): Promise<number> {
        try {
            // We create a filtering condition by reading status
            const whereClause: any = { userId: userId };
            if (unreadOnly) {
                whereClause.read = false; // only unread
            }
            // if unreadOnly = false - we get ALL records (both read and not)

            // We receive all user-notification communications
            const userNotifications = await this.userNotificationModel().find({
                where: whereClause,
                populate: {notificationId: true}
            });

            if (userNotifications.length === 0) return 0;

            // Filter by notification class using notificationId
            const validNotificationIds = userNotifications
                .map((un: any) => un.notificationId.id)
                .filter((id: any) => id != null);

            if (validNotificationIds.length === 0) return 0;

            // We recalculate only those whose notificationClass matches
            return await this.notificationModel().count({
                where: {
                    id: validNotificationIds,
                    notificationClass: this.notificationClass
                }
            });
        } catch (error) {
            Adminizer.log.error(`Error counting ${unreadOnly ? 'unread' : 'all'} notifications:`, error);
            return 0;
        }
    }

    /**
     * Convenience method to get the number of unread notifications for a user.
     * Equivalent to calling getNotificationsCount(userId, true).
     *
     * @param {number} userId - The ID of the user.
     * @returns {Promise<number>} A promise that resolves with the number of unread notifications.
     *
     * @example
     * const unread = await service.getUnreadNotificationsCount(123);
     */
    async getUnreadNotificationsCount(userId: number): Promise<number> {
        return this.getNotificationsCount(userId, true);
    }
}
