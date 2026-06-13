import {DataTypes, Sequelize} from "sequelize";

export function registerSequelizeSystemModels(orm: Sequelize): void {
    const UserAP = orm.define("UserAP", {
        id: {type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true},
        login: {type: DataTypes.STRING, allowNull: false, unique: true},
        fullName: {type: DataTypes.STRING, allowNull: false},
        email: DataTypes.STRING,
        avatar: DataTypes.STRING,
        passwordHashed: DataTypes.STRING,
        timezone: DataTypes.STRING,
        expires: DataTypes.STRING,
        locale: DataTypes.STRING,
        isDeleted: DataTypes.BOOLEAN,
        isActive: DataTypes.BOOLEAN,
        isAdministrator: DataTypes.BOOLEAN,
        widgets: DataTypes.JSON,
        isConfirmed: DataTypes.BOOLEAN,
        apiKey: {type: DataTypes.STRING, field: "userApiKey"},
    }, systemModelOptions("UserAP"));

    const GroupAP = orm.define("GroupAP", {
        id: {type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true},
        name: {type: DataTypes.STRING, allowNull: false, unique: true},
        description: DataTypes.STRING,
        tokens: DataTypes.JSON,
    }, systemModelOptions("GroupAP"));

    const FilterAP = orm.define("FilterAP", {
        id: {type: DataTypes.STRING, primaryKey: true},
        name: {type: DataTypes.STRING, allowNull: false},
        description: DataTypes.STRING,
        modelName: {type: DataTypes.STRING, allowNull: false},
        conditions: DataTypes.JSON,
        sortField: DataTypes.STRING,
        sortDirection: DataTypes.STRING,
        visibility: DataTypes.STRING,
        ownerId: DataTypes.INTEGER,
        groupIds: DataTypes.JSON,
        apiEnabled: DataTypes.BOOLEAN,
        apiKey: DataTypes.STRING,
        icon: DataTypes.STRING,
        color: DataTypes.STRING,
        version: DataTypes.INTEGER,
    }, systemModelOptions("FilterAP"));

    const FilterColumnAP = orm.define("FilterColumnAP", {
        id: {type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true},
        fieldName: {type: DataTypes.STRING, allowNull: false},
        order: DataTypes.INTEGER,
    }, systemModelOptions("FilterColumnAP"));

    const HistoryActionsAP = orm.define("HistoryActionsAP", {
        id: {type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true},
        modelId: {type: DataTypes.STRING, allowNull: false},
        modelName: {type: DataTypes.STRING, allowNull: false},
        action: DataTypes.STRING,
        data: DataTypes.JSON,
        diff: DataTypes.JSON,
        isCurrent: DataTypes.BOOLEAN,
        preview: DataTypes.BOOLEAN,
    }, systemModelOptions("HistoryActionsAP"));

    const NotificationAP = orm.define("NotificationAP", {
        id: {type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true},
        title: DataTypes.STRING,
        message: DataTypes.STRING,
        notificationClass: DataTypes.STRING,
        channel: DataTypes.STRING,
        metadata: DataTypes.JSON,
    }, systemModelOptions("NotificationAP"));

    const UserNotificationAP = orm.define("UserNotificationAP", {
        id: {type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true},
        userId: {type: DataTypes.INTEGER, allowNull: false},
        read: {type: DataTypes.BOOLEAN, defaultValue: false},
    }, systemModelOptions("UserNotificationAP"));

    UserAP.belongsToMany(GroupAP, {
        through: "groupapuserap",
        as: "groups",
        foreignKey: "UserAPId",
        otherKey: "GroupAPId",
    });
    GroupAP.belongsToMany(UserAP, {
        through: "groupapuserap",
        as: "users",
        foreignKey: "GroupAPId",
        otherKey: "UserAPId",
    });

    FilterAP.hasMany(FilterColumnAP, {
        as: "columns",
        foreignKey: "FilterAPId",
    });
    FilterColumnAP.belongsTo(FilterAP, {
        as: "filter",
        foreignKey: "FilterAPId",
    });

    HistoryActionsAP.belongsTo(UserAP, {
        as: "user",
        foreignKey: "userId",
    });
    UserNotificationAP.belongsTo(NotificationAP, {
        as: "notificationId",
        foreignKey: "notificationIdId",
    });
}

function systemModelOptions(modelName: string) {
    return {
        tableName: modelName.toLowerCase(),
        timestamps: true,
    };
}
