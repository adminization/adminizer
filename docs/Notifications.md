# Notification System Documentation

## System Overview

The notification system is a mechanism for sending and managing real-time notifications to users through a web interface. It operates on a publisher-subscriber principle, where various services can send notifications, and clients (users' browsers) receive them in real time.

## Key Components

### AbstractNotificationService
A base class for all notification types that provides:

- **Connection Management** - tracks all connected users and their clients
- **Message Delivery** - distributes notifications to all active clients
- **History Storage** - saves notifications in the database for later viewing
- **Read Status** - tracks which notifications have been viewed by the user

### NotificationHandler
A central coordinator that:

- **Registers Services** - manages different notification types
- **Routes Notifications** - directs notifications to the appropriate service
- **Provides Access** - enables working with all registered services

## How It Works

### 1. Client Connections
When a user opens the web interface, their browser establishes a connection with the notification server. The system remembers this connection and associates it with the specific user.

### 2. Sending Notifications
Any service can send a notification by specifying:
- Notification type (class)
- Message for the user
- Additional data

The system automatically:
- Saves the notification to the database
- Sends it to all of the user's active connections
- Updates unread notification counters

### 3. Receiving Notifications
Clients receive notifications in real time through the established connection. If the user is offline, notifications are saved and will be shown upon next connection.

### 4. Notification Management
Users can:
- View notification history
- Mark notifications as read
- Search through notification history
- Receive only unread notifications

## Notification Types

The system supports various notification types through separate services. Each type can have:
- Its own icon and color
- Specific delivery logic
- Different access rights

## System Advantages

- **Scalability** - supports multiple users and notification types
- **Reliability** - preserves notifications even when clients disconnect
- **Flexibility** - easy to add new notification types
- **Security** - controls access rights to different notification types
- **Performance** - efficient delivery through persistent connections

The system provides seamless user interaction by delivering important information in real time while maintaining history for future reference.


## Configuration

Notifications are disabled by default. Enable them in `AdminpanelConfig`:

```ts
notifications: {
    enabled: true,
    enableGeneral: true,
    initTab: 'general',
}
```

The notification system is initialized through `bindNotifications()`. It creates a `NotificationHandler` and registers `GeneralNotificationService` when `notifications.enableGeneral` is enabled.

`SystemNotificationService` exists in the codebase, but it is not registered by default.

## Integration with Adminizer

The system is tightly integrated with the main Adminizer framework:

### Helper Methods for Developers

Adminizer provides convenient methods for sending notifications:

#### 1. General Notification Sending
```typescript
await adminizer.sendNotification({
    notificationClass: 'general',              // Notification type
    title: 'New Message',                      // Title
    message: 'You have a new message',         // Message text
    userId: 123,                               // User ID (optional)
    metadata: { important: true }              // Additional data
});
```

For custom notification classes, create a service that extends `AbstractNotificationService` and register it with `adminizer.notificationHandler.registerService(...)` after notifications are initialized.

## Default Notification Service Types

### GeneralNotificationService
- **Purpose**: General user notifications
- **Usage**: Notifications from other users, alerts, reminders

### SystemNotificationService
- **Purpose**: System events and automatic notifications
- **Status**: Available in code, but not registered by default

## Access Rights

The system automatically registers access rights for each notification type through `AccessRightsHelper`. Users can only receive notifications for which they have permissions.
