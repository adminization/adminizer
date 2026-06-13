import {DataTypes, Sequelize} from "sequelize";

export const navigationModelName = "Navigation";

export async function installNavigationSequelizeModel(
    orm: Sequelize,
    modelName: string = navigationModelName,
    sync: boolean = false
): Promise<void> {
    let model = Object.values(orm.models).find(
        (registeredModel) => registeredModel.name.toLowerCase() === modelName.toLowerCase()
    );

    if (!model) {
        model = orm.define(modelName, {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            label: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
            },
            tree: {
                type: DataTypes.JSON,
                allowNull: false,
            },
        }, {
            tableName: modelName.toLowerCase(),
            timestamps: true,
        });
    }

    if (sync) {
        await model.sync();
    }
}

export interface NavigationModel {
    id?: number;
    label: string;
    tree: Record<string, unknown>;
}
