import type {NotificationAP} from "./NotificationAP";

export interface UserNotificationAP {
    id: number,
    userId: number,
    notificationId: NotificationAP,
    read: boolean
}
