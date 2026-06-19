import type {Notification} from "./Notification";

export interface UserNotification {
    id: number,
    userId: number,
    notificationId: Notification,
    read: boolean
}
