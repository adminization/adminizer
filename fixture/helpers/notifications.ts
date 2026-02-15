import { INotification, Adminizer } from "../../dist";
import { faker } from '@faker-js/faker';

export interface SendNotificationsOptions {
    count?: number;
    delayMs?: number;
    userId?: number;
    onlyGeneral?: boolean;
    generalRatio?: number; // Probability of general notifications (0-1)
}

export async function sendNotificationsWithDelay(
    adminizer: Adminizer,
    options: SendNotificationsOptions = {}
) {
    const {
        count = 10,
        delayMs = 2000,
        generalRatio = 0.7 // 70% general, 30% system default
    } = options;

    const systemChannels = ['created', 'updated', 'deleted', 'system'] as const;
    const entities = ['user', 'product', 'order', 'category', 'payment'] as const;
    const actions = ['create', 'update', 'delete', 'approve', 'reject'] as const;

    const generateRandomNotification = (): Omit<INotification, 'id' | 'createdAt' | 'icon'> => {
        // Determining the type of notification based on probability
        const isGeneral = options.onlyGeneral ? true : faker.number.float({ min: 0, max: 1 }) < generalRatio;

        if (!isGeneral) {
            // System notification
            const channel = faker.helpers.arrayElement(systemChannels);
            const entity = faker.helpers.arrayElement(entities);
            const action = faker.helpers.arrayElement(actions);

            return {
                title: `System notification - ${faker.helpers.arrayElement(['Created', 'Updated', 'Deleted', 'Event'])}`,
                message: faker.helpers.arrayElement([
                    `${faker.helpers.arrayElement(['New', 'Updated', 'Deleted'])} ${entity} ${faker.helpers.arrayElement(['has been created', 'was updated', 'has been deleted'])}`,
                    `System event: ${faker.lorem.words(3)}`,
                    `Automatic notification about ${faker.lorem.word()}`,
                    `${faker.company.name()} system update completed`,
                    `Maintenance scheduled for ${faker.date.future().toLocaleDateString()}`
                ]),
                notificationClass: 'system',
                channel: channel,
                metadata: {
                    entity,
                    action,
                    timestamp: new Date().toISOString(),
                    details: faker.lorem.sentence(),
                    referenceId: faker.string.uuid(),
                    severity: faker.helpers.arrayElement(['low', 'medium', 'high', 'critical'])
                }
            };
        } else {
            // General notification
            const userIdOption = options.userId ?? faker.helpers.arrayElement([
                undefined, // for all users
                1,         // user with ID 1
                2          // user with ID 2
            ]);

            const hasUserId = userIdOption !== undefined;
            const hasLongMessage = faker.datatype.boolean();

            const notification: Omit<INotification, 'id' | 'createdAt' | 'icon'> = {
                title: faker.helpers.arrayElement([
                    'Important Notification',
                    'New Message',
                    'System Update',
                    'Information Message',
                    'Alert',
                    'Reminder',
                    'News Update',
                    'Security Notice'
                ]),
                message: hasLongMessage
                    ? faker.lorem.paragraphs(faker.number.int({ min: 2, max: 5 }))
                    : faker.lorem.sentence(),
                notificationClass: 'general',
                channel: '',
            };

            // Add userId only if it is specified
            if (hasUserId) {
                return {
                    ...notification,
                    userId: userIdOption
                };
            }

            return notification;
        }
    };

    for (let i = 0; i < count; i++) {
        await new Promise(resolve => setTimeout(resolve, delayMs));

        const notification = generateRandomNotification();

        try {
            if (notification.notificationClass === "general") {
                await adminizer.sendNotification(notification);

            } else if (notification.notificationClass === 'system') {
                switch (notification.channel) {
                    case 'created':
                        await adminizer.logSystemCreatedEvent(
                            notification.title,
                            notification.message,
                            notification.metadata
                        );
                        break;
                    case 'updated':
                        await adminizer.logSystemUpdatedEvent(
                            notification.title,
                            notification.message,
                            notification.metadata
                        );
                        break;
                    case 'deleted':
                        await adminizer.logSystemDeletedEvent(
                            notification.title,
                            notification.message,
                            notification.metadata
                        );
                        break;
                    case 'system':
                    default:
                        await adminizer.logSystemEvent(
                            notification.title,
                            notification.message,
                            notification.metadata
                        );
                        break;
                }
            }
        } catch (error) {
            console.error(`✗ Failed to send notification ${i + 1}/${count}:`, error);
        }
    }
}