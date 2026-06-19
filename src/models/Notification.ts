import {Model} from "sequelize";

export interface Notification {
    id: string;
    title: string;
    message: string;
    channel: string;
    notificationClass: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
}

export interface NotificationModel extends Model<Notification>, Notification {
    toJSON(): Notification;
}
