import {Adminizer} from '../../lib/Adminizer';
import {UserAP} from "../../models/UserAP";
import {SystemNotificationService} from "../../lib/notifications/SystemNotificationService";
import {INotification} from "../../interfaces/types";

export class NotificationController {
    static async search(req: ReqType, res: ResType): Promise<void> {
        if (!NotificationController.checkNotifStatus(req, res)) return;

        if (req.method.toUpperCase() === 'POST') {
            const {s, notificationClass} = req.body;
            const hasPermission = req.adminizer.accessRightsHelper.hasPermission(
                `notification-${notificationClass}`,
                req.user
            );

            if (!hasPermission) {
                res.status(403).json({error: 'Forbidden'});
                return;
            }

            const service = req.adminizer.notificationHandler.getService(notificationClass);

            res.json(await service.search(s, req.user.id));
        }
    }

    static async viewAll(req: ReqType, res: ResType): Promise<void> {
        if (!NotificationController.checkNotifStatus(req, res)) return;

        if (req.method.toUpperCase() === 'POST') {
            const messages = {
                "Make read": "",
                "View All": "",
                "Search": "",
                "Make all read": "",
                "Title": "",
                "Message": "",
                "Date": "",
                "Diff": "",
                "The end of the list has been reached": "",
            };

            res.json(Object.fromEntries(
                Object.keys(messages).map(key => [key, req.i18n.__(key)])
            ));
            return;
        }

        if (req.method.toUpperCase() === 'GET') {
            req.Inertia.render({
                component: 'notification',
                props: {
                    title: req.i18n.__('Notifications'),
                }
            });
            return;
        }

        res.status(405).end();
    }

    static async getNotificationClasses(req: ReqType, res: ResType): Promise<void> {
        if (!NotificationController.checkNotifStatus(req, res)) return;

        if (req.adminizer.config.notifications.enabled === false) {
            Adminizer.log.warn('[Notifications] Notifications disabled in config');
            res.json([]);
            return;
        }

        const services = req.adminizer.notificationHandler.getAllServices();
        let activeServices = []

        for (const service of services) {
            const hasPermission = req.adminizer.accessRightsHelper.hasPermission(
                `notification-${service.notificationClass}`,
                req.user
            );

            if (hasPermission) {
                activeServices.push({
                    displayName: req.i18n.__(service.displayName),
                    notificationClass: service.notificationClass,
                });
            }
        }

        res.json({
            activeServices: activeServices,
            initTab: req.adminizer.config?.notifications?.initTab || null
        });
    }

    static async getNotificationsStream(req: ReqType, res: ResType): Promise<void> {
        if (!NotificationController.checkNotifStatus(req, res)) return;

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.setHeader('Content-Encoding', 'identity');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.flushHeaders();

        res.write(': stream-open\n\n');

        const clientId = `user-${req.user?.id}-${Date.now()}`;

        // Function for sending events to the client
        const sendEvent = (event: any) => {
            // Filtering notifications by user rights
            if (event.type === 'notification') {
                const notificationClass = event.notificationClass;

                // UNIFIED rights check via AccessRightsHelper
                const hasPermission = req.adminizer.accessRightsHelper.hasPermission(
                    `notification-${notificationClass}`,
                    req.user
                );

                if (!hasPermission) {
                    return; // The user does not have rights to this notification class
                }

                // Checking personal notifications (target user only)
                if (event.userId !== null && event.userId !== req.user.id) {
                    return;
                }
            }

            res.write(`event: ${event.type}\n`);
            res.write(`data: ${JSON.stringify(event.data)}\n\n`);
            (res as any).flush?.();
        };

        // We connect the client to all services
        const services = req.adminizer.notificationHandler.getAllServices();

        const allowedServices = services.filter(service =>
            req.adminizer.accessRightsHelper.hasPermission(
                `notification-${service.notificationClass}`,
                req.user
            )
        );

        allowedServices.forEach(service => {
            service.addClient(clientId, sendEvent, req.user);

            // For a system service, add a client to CRUD channels
            // if (service.notificationClass === 'system') {
            //     const systemService = service as SystemNotificationService;
            //     // Add the client to the main CRUD channels indicating userId
            //     ['created', 'updated', 'deleted', 'system'].forEach(channel => {
            //         systemService.addClientToChannel(clientId, channel, req.user.id);
            //     });
            // }
        });

        sendEvent({
            type: 'connected',
            data: {
                message: 'Connected to unified notification stream',
                clientId: clientId
            }
        });

        // Handling connection closure
        req.on('close', () => {
            // Disconnecting the client from all services
            services.forEach(service => {
                service.removeClient(clientId);

                // For system service, remove from all channels
                // if (service.notificationClass === 'system') {
                //     const systemService = service as SystemNotificationService;
                //     if (systemService.removeClientFromAllChannels) {
                //         systemService.removeClientFromAllChannels(clientId, req.user.id);
                //     }
                // }
            });
            res.end();
        });

        // Heartbeat to keep you connected
        const heartbeatInterval = setInterval(() => {
            if (!res.writableEnded) {
                res.write(': keepalive\n\n');
                (res as any).flush?.();
            } else {
                clearInterval(heartbeatInterval);
            }
        }, 30000);

        req.on('close', () => {
            clearInterval(heartbeatInterval);
        });
    }

    // API for receiving class notifications
    static async getNotificationsByClass(req: ReqType, res: ResType): Promise<void> {
        if (!NotificationController.checkNotifStatus(req, res)) return;

        try {
            const {notificationClass} = req.params;
            const {limit = 20, skip = 0, unreadOnly = false} = req.query;

            // Checking access rights
            const hasPermission = req.adminizer.accessRightsHelper.hasPermission(
                `notification-${notificationClass}`,
                req.user
            );

            if (!hasPermission) {
                res.status(403).json({error: 'Forbidden'});
                return;
            }
            const service = req.adminizer.notificationHandler.getService(notificationClass);

            if(!service) {
                res.json({});
                return;
            }

            const notifications = await service.getNotifications(
                req.user?.id,
                Number(limit),
                Number(skip),
                unreadOnly === 'true'
            );

            res.json(notifications);
        } catch (error) {
            Adminizer.log.error('Error getting notifications:', error);
            res.status(500).json({error: 'Internal server error'});
        }
    }

    // API for receiving all user notifications
    static async getUserNotifications(req: ReqType, res: ResType): Promise<void> {
        if (!NotificationController.checkNotifStatus(req, res)) return;

        const {limit = 4, skip = 0, unreadOnly = false} = req.query;

        try {
            // Filtering services by access rights
            const services = req.adminizer.notificationHandler.getAllServices();
            const allowedServices = services.filter(service =>
                req.adminizer.accessRightsHelper.hasPermission(
                    `notification-${service.notificationClass}`,
                    req.user
                )
            );

            const allNotifications: INotification[] = [];

            for (const service of allowedServices) {
                const notifications = await service.getNotifications(
                    req.user.id,
                    Number(limit),
                    Number(skip),
                    unreadOnly === 'true'
                );
                allNotifications.push(...notifications);
            }

            // Sort by creation date
            const sortedNotifications = allNotifications.sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            ).slice(0, Number(limit));

            res.json(sortedNotifications);

        } catch (error) {
            Adminizer.log.error('Error getting user notifications:', error);
            res.status(500).json({error: 'Internal server error'});
        }
    }

    // API for marking as read
    static async markAsRead(req: ReqType, res: ResType): Promise<void> {
        if (!NotificationController.checkNotifStatus(req, res)) return;

        try {
            const {notificationClass, id} = req.params;

            const service = req.adminizer.notificationHandler.getService(notificationClass);
            await service.markAsRead(req.user.id, id);

            res.json({success: true});
        } catch (error) {
            Adminizer.log.error('Error marking notification as read:', error);
            res.status(500).json({error: 'Internal server error'});
        }
    }

    static async markAllAsRead(req: ReqType, res: ResType): Promise<void> {
        if (!NotificationController.checkNotifStatus(req, res)) return;

        try {
            const services = req.adminizer.notificationHandler.getAllServices();

            for (const service of services) {
                await service.markAllAsRead(req.user.id);
            }
            res.json({success: true});
        } catch (error) {
            Adminizer.log.error('Error marking all notifications as read:', error);
            res.status(500).json({error: 'Internal server error'});
        }
    }

    private static checkNotifStatus(req: ReqType, res: ResType): boolean {
        if (!req.adminizer?.notificationHandler) {
            res.status(500).json({error: 'Notification system not initialized'});
            return false;
        }
        return true;
    }
}
