/**
 * TypeORM twin of fixture/models/sequelize/ProjectGraph.ts — the same
 * Project → Task → Message chain with ProjectMember carrying the membership.
 * The graph declaration (fixture/accessGraph.ts) is ORM-agnostic and covers both.
 */
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

export const ProjectTypeOrm = new EntitySchema<Record<string, any>>({
    name: "Project",
    tableName: "project",
    columns: {
        id: {type: "integer", primary: true, generated: true},
        name: {type: "varchar", nullable: false},
        description: {type: "text", nullable: true},
        ...timestamps,
    },
});

export const ProjectMemberTypeOrm = new EntitySchema<Record<string, any>>({
    name: "ProjectMember",
    tableName: "projectmember",
    columns: {
        id: {type: "integer", primary: true, generated: true},
        ...timestamps,
    },
    relations: {
        project: {
            type: "many-to-one",
            target: "Project",
            joinColumn: {name: "projectId"},
            nullable: false,
        },
        user: {
            type: "many-to-one",
            target: "UserAP",
            joinColumn: {name: "userId"},
            nullable: false,
        },
        group: {
            type: "many-to-one",
            target: "GroupAP",
            joinColumn: {name: "groupId"},
            nullable: true,
        },
    },
});

export const TaskTypeOrm = new EntitySchema<Record<string, any>>({
    name: "Task",
    tableName: "task",
    columns: {
        id: {type: "integer", primary: true, generated: true},
        title: {type: "varchar", nullable: false},
        status: {type: "varchar", nullable: true, default: "open"},
        ...timestamps,
    },
    relations: {
        // The graph edge: Task.project → Project (the root itself)
        project: {
            type: "many-to-one",
            target: "Project",
            joinColumn: {name: "projectId"},
            nullable: false,
        },
    },
});

export const MessageTypeOrm = new EntitySchema<Record<string, any>>({
    name: "Message",
    tableName: "message",
    columns: {
        id: {type: "integer", primary: true, generated: true},
        text: {type: "text", nullable: false},
        ...timestamps,
    },
    relations: {
        // The graph edge: Message.task → Task, which reaches Project transitively
        task: {
            type: "many-to-one",
            target: "Task",
            joinColumn: {name: "taskId"},
            nullable: false,
        },
        author: {
            type: "many-to-one",
            target: "UserAP",
            joinColumn: {name: "authorId"},
            nullable: true,
        },
    },
});

export const projectGraphTypeOrmModels = [
    ProjectTypeOrm,
    ProjectMemberTypeOrm,
    TaskTypeOrm,
    MessageTypeOrm,
];
