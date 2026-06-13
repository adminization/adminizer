import {Model} from "sequelize";

export interface NotificationAP {
    id: string;
    title: string;
    message: string;
    channel: string;
    notificationClass: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
}

export interface NotificationAPModel extends Model<NotificationAP>, NotificationAP {
    toJSON(): NotificationAP;
}
