import {
    DataTypes,
    Model,
    ModelAttributes,
    ModelStatic,
    Sequelize,
} from "sequelize";

export const mediaManagerModelNames = {
    media: "MediaManagerAP",
    meta: "MediaManagerMetaAP",
    associations: "MediaManagerAssociationsAP",
} as const;

export async function installMediaManagerSequelizeModels(
    orm: Sequelize,
    sync: boolean = false
): Promise<void> {
    const Media = getOrDefine(orm, mediaManagerModelNames.media, {
        id: {type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true},
        parentId: {type: DataTypes.INTEGER, allowNull: true},
        mimeType: {type: DataTypes.STRING, allowNull: false},
        path: {type: DataTypes.STRING, allowNull: false},
        size: {type: DataTypes.INTEGER, allowNull: false},
        group: DataTypes.STRING,
        tag: DataTypes.STRING,
        url: {type: DataTypes.STRING, allowNull: false},
        filename: {type: DataTypes.STRING, allowNull: false},
    });
    const Meta = getOrDefine(orm, mediaManagerModelNames.meta, {
        id: {type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true},
        key: {type: DataTypes.STRING, allowNull: false},
        value: DataTypes.JSON,
        isPublic: {type: DataTypes.BOOLEAN, defaultValue: true},
        parentId: {type: DataTypes.INTEGER, allowNull: false},
    });
    const Associations = getOrDefine(orm, mediaManagerModelNames.associations, {
        id: {type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true},
        mediaManagerId: {type: DataTypes.STRING, allowNull: false},
        model: {type: DataTypes.STRING, allowNull: false},
        modelId: {type: DataTypes.STRING, allowNull: false},
        widgetName: {type: DataTypes.STRING, allowNull: false},
        sortOrder: {type: DataTypes.INTEGER, allowNull: false},
        fileId: {type: DataTypes.INTEGER, allowNull: false},
    });

    if (!Media.associations.parent) {
        Media.belongsTo(Media, {as: "parent", foreignKey: "parentId"});
        Media.hasMany(Media, {as: "variants", foreignKey: "parentId"});
    }
    if (!Media.associations.meta) {
        Media.hasMany(Meta, {as: "meta", foreignKey: "parentId"});
        Meta.belongsTo(Media, {as: "parent", foreignKey: "parentId"});
    }
    if (!Media.associations.modelAssociation) {
        Media.hasMany(Associations, {as: "modelAssociation", foreignKey: "fileId"});
        Associations.belongsTo(Media, {as: "file", foreignKey: "fileId"});
    }

    if (sync) {
        await Media.sync();
        await Meta.sync();
        await Associations.sync();
    }
}

function getOrDefine(
    orm: Sequelize,
    name: string,
    attributes: ModelAttributes<Model, Record<string, unknown>>
): ModelStatic<Model> {
    const existing = Object.values(orm.models).find(
        (model) => model.name.toLowerCase() === name.toLowerCase()
    );
    return existing ?? orm.define(name, attributes, {
        tableName: name.toLowerCase(),
        timestamps: true,
    });
}
