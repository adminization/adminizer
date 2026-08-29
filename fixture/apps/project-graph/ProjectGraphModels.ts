/**
 * Sequelize models of the Project → Task → Message access-graph demo.
 *
 * Installed by the host before the app is enabled, exactly like the media manager
 * models: an app can register a model with the panel, but it cannot add tables to
 * someone else's ORM connection.
 */
import {
    DataTypes,
    Model,
    ModelAttributes,
    ModelStatic,
    Sequelize,
} from "sequelize";

export const projectGraphModelNames = {
    project: "Project",
    member: "ProjectMember",
    task: "Task",
    message: "Message",
} as const;

export interface ProjectGraphSystemModelNames {
    /** Host model behind the canonical `User` resource. */
    user?: string;
    /** Host model behind the canonical `Group` resource. */
    group?: string;
}

export async function installProjectGraphSequelizeModels(
    orm: Sequelize,
    sync: boolean = false,
    systemModels: ProjectGraphSystemModelNames = {}
): Promise<void> {
    const UserModel = orm.model(systemModels.user ?? "UserAP");
    const GroupModel = orm.model(systemModels.group ?? "GroupAP");

    const Project = getOrDefine(orm, projectGraphModelNames.project, {
        id: {type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true},
        name: {type: DataTypes.STRING, allowNull: false},
        description: DataTypes.TEXT,
    });

    // Membership rows of the graph root: who belongs to which project, in which role.
    const ProjectMember = getOrDefine(orm, projectGraphModelNames.member, {
        id: {type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true},
        projectId: {type: DataTypes.INTEGER, allowNull: false},
        userId: {type: DataTypes.INTEGER, allowNull: false},
        groupId: {type: DataTypes.INTEGER, allowNull: true},
    });

    const Task = getOrDefine(orm, projectGraphModelNames.task, {
        id: {type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true},
        title: {type: DataTypes.STRING, allowNull: false},
        status: {type: DataTypes.STRING, defaultValue: "open"},
        projectId: {type: DataTypes.INTEGER, allowNull: false},
    });

    const Message = getOrDefine(orm, projectGraphModelNames.message, {
        id: {type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true},
        text: {type: DataTypes.TEXT, allowNull: false},
        taskId: {type: DataTypes.INTEGER, allowNull: false},
        authorId: {type: DataTypes.INTEGER, allowNull: true},
    });

    if (!ProjectMember.associations.project) {
        ProjectMember.belongsTo(Project, {as: "project", foreignKey: "projectId"});
        ProjectMember.belongsTo(UserModel, {as: "user", foreignKey: "userId"});
        // The per-project role: a regular Group record whose tokens decide which
        // actions this membership counts for.
        ProjectMember.belongsTo(GroupModel, {as: "group", foreignKey: "groupId"});
    }
    // The graph edges. Task hangs directly off the root, Message reaches it through Task.
    if (!Task.associations.project) {
        Task.belongsTo(Project, {as: "project", foreignKey: "projectId"});
    }
    if (!Message.associations.task) {
        Message.belongsTo(Task, {as: "task", foreignKey: "taskId"});
        Message.belongsTo(UserModel, {as: "author", foreignKey: "authorId"});
    }

    if (sync) {
        await Project.sync();
        await ProjectMember.sync();
        await Task.sync();
        await Message.sync();
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
