import {EntitySchema} from "typeorm";

const timestamps = {
    createdAt: {
        type: "datetime" as const,
        createDate: true,
    },
    updatedAt: {
        type: "datetime" as const,
        updateDate: true,
    },
};

export const UserAPTypeOrm = new EntitySchema<Record<string, any>>({
    name: "UserAP",
    tableName: "userap",
    columns: {
        id: {type: "integer", primary: true, generated: true},
        login: {type: "varchar", nullable: false, unique: true},
        fullName: {type: "varchar", nullable: false},
        email: {type: "varchar", nullable: true},
        avatar: {type: "varchar", nullable: true},
        passwordHashed: {type: "varchar", nullable: true},
        timezone: {type: "varchar", nullable: true},
        expires: {type: "varchar", nullable: true},
        locale: {type: "varchar", nullable: true},
        isDeleted: {type: "boolean", nullable: true},
        isActive: {type: "boolean", nullable: true},
        isAdministrator: {type: "boolean", nullable: true},
        widgets: {type: "simple-json", nullable: true},
        isConfirmed: {type: "boolean", nullable: true},
        apiKey: {type: "varchar", name: "userApiKey", nullable: true},
        ...timestamps,
    },
    relations: {
        groups: {
            type: "many-to-many",
            target: "GroupAP",
            inverseSide: "users",
            joinTable: {
                name: "groupapuserap",
                joinColumn: {name: "UserAPId"},
                inverseJoinColumn: {name: "GroupAPId"},
            },
        },
    },
});

export const GroupAPTypeOrm = new EntitySchema<Record<string, any>>({
    name: "GroupAP",
    tableName: "groupap",
    columns: {
        id: {type: "integer", primary: true, generated: true},
        name: {type: "varchar", nullable: false, unique: true},
        description: {type: "varchar", nullable: true},
        tokens: {type: "simple-json", nullable: true},
        ...timestamps,
    },
    relations: {
        users: {
            type: "many-to-many",
            target: "UserAP",
            inverseSide: "groups",
        },
    },
});

export const FilterAPTypeOrm = new EntitySchema<Record<string, any>>({
    name: "FilterAP",
    tableName: "filterap",
    columns: {
        id: {type: "varchar", primary: true},
        name: {type: "varchar", nullable: false},
        description: {type: "varchar", nullable: true},
        modelName: {type: "varchar", nullable: false},
        conditions: {type: "simple-json", nullable: true},
        sortField: {type: "varchar", nullable: true},
        sortDirection: {type: "varchar", nullable: true},
        visibility: {type: "varchar", nullable: true},
        ownerId: {type: "integer", nullable: true},
        groupIds: {type: "simple-json", nullable: true},
        apiEnabled: {type: "boolean", nullable: true},
        apiKey: {type: "varchar", nullable: true},
        icon: {type: "varchar", nullable: true},
        color: {type: "varchar", nullable: true},
        version: {type: "integer", nullable: true},
        ...timestamps,
    },
    relations: {
        columns: {
            type: "one-to-many",
            target: "FilterColumnAP",
            inverseSide: "filter",
        },
    },
});

export const FilterColumnAPTypeOrm = new EntitySchema<Record<string, any>>({
    name: "FilterColumnAP",
    tableName: "filtercolumnap",
    columns: {
        id: {type: "integer", primary: true, generated: true},
        fieldName: {type: "varchar", nullable: false},
        order: {type: "integer", nullable: true},
        ...timestamps,
    },
    relations: {
        filter: {
            type: "many-to-one",
            target: "FilterAP",
            inverseSide: "columns",
            joinColumn: {name: "FilterAPId"},
            nullable: true,
        },
    },
});

export const HistoryActionsAPTypeOrm = new EntitySchema<Record<string, any>>({
    name: "HistoryActionsAP",
    tableName: "historyactionsap",
    columns: {
        id: {type: "integer", primary: true, generated: true},
        modelId: {type: "varchar", nullable: false},
        modelName: {type: "varchar", nullable: false},
        action: {type: "varchar", nullable: true},
        data: {type: "simple-json", nullable: true},
        diff: {type: "simple-json", nullable: true},
        isCurrent: {type: "boolean", nullable: true},
        preview: {type: "boolean", nullable: true},
        ...timestamps,
    },
    relations: {
        user: {
            type: "many-to-one",
            target: "UserAP",
            joinColumn: {name: "userId"},
            nullable: true,
        },
    },
});

export const NotificationAPTypeOrm = new EntitySchema<Record<string, any>>({
    name: "NotificationAP",
    tableName: "notificationap",
    columns: {
        id: {type: "integer", primary: true, generated: true},
        title: {type: "varchar", nullable: true},
        message: {type: "varchar", nullable: true},
        notificationClass: {type: "varchar", nullable: true},
        channel: {type: "varchar", nullable: true},
        metadata: {type: "simple-json", nullable: true},
        ...timestamps,
    },
});

export const UserNotificationAPTypeOrm = new EntitySchema<Record<string, any>>({
    name: "UserNotificationAP",
    tableName: "usernotificationap",
    columns: {
        id: {type: "integer", primary: true, generated: true},
        userId: {type: "integer", nullable: false},
        read: {type: "boolean", default: false},
        ...timestamps,
    },
    relations: {
        notificationId: {
            type: "many-to-one",
            target: "NotificationAP",
            joinColumn: {name: "notificationIdId"},
            nullable: true,
        },
    },
});

export const typeOrmSystemModels = [
    UserAPTypeOrm,
    GroupAPTypeOrm,
    FilterAPTypeOrm,
    FilterColumnAPTypeOrm,
    HistoryActionsAPTypeOrm,
    NotificationAPTypeOrm,
    UserNotificationAPTypeOrm,
];
