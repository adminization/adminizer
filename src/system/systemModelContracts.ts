import type {AbstractModel, Attribute} from "../lib/model/AbstractModel";

export interface SystemModelAttributeContract {
    type?: Attribute["type"];
    required?: boolean;
    columnName?: string;
    relation?: {
        kind: "one" | "many";
        target: string;
    };
}

export interface SystemModelContract {
    name: string;
    primaryKey: string;
    attributes: Record<string, SystemModelAttributeContract>;
}

export const SYSTEM_MODEL_CONTRACTS: readonly SystemModelContract[] = [
    {
        name: "UserAP", //"-> User"
        primaryKey: "id",
        attributes: {
            id: {type: "number"},
            login: {type: "string", required: true},
            fullName: {type: "string", required: true},
            email: {type: "string"},
            avatar: {type: "string"},
            passwordHashed: {type: "string"},
            timezone: {type: "string"},
            expires: {type: "string"},
            locale: {type: "string"},
            isDeleted: {type: "boolean"},
            isActive: {type: "boolean"},
            isAdministrator: {type: "boolean"},
            groups: {relation: {kind: "many", target: "GroupAP"}},
            widgets: {type: "json"},
            isConfirmed: {type: "boolean"},
            apiKey: {type: "string", columnName: "userApiKey"},
        },
    },
    {
        name: "GroupAP",
        primaryKey: "id",
        attributes: {
            id: {type: "number"},
            name: {type: "string", required: true},
            description: {type: "string"},
            tokens: {type: "json"},
            users: {relation: {kind: "many", target: "UserAP"}},
        },
    },
    {
        name: "FilterAP",
        primaryKey: "id",
        attributes: {
            id: {type: "string"},
            name: {type: "string", required: true},
            description: {type: "string"},
            modelName: {type: "string", required: true},
            conditions: {type: "json"},
            sortField: {type: "string"},
            sortDirection: {type: "string"},
            visibility: {type: "string"},
            ownerId: {type: "number"},
            groupIds: {type: "json"},
            apiEnabled: {type: "boolean"},
            apiKey: {type: "string"},
            icon: {type: "string"},
            color: {type: "string"},
            version: {type: "number"},
            columns: {relation: {kind: "many", target: "FilterColumnAP"}},
            createdAt: {type: "string"},
            updatedAt: {type: "string"},
        },
    },
    {
        name: "FilterColumnAP",
        primaryKey: "id",
        attributes: {
            id: {type: "number"},
            filter: {relation: {kind: "one", target: "FilterAP"}},
            fieldName: {type: "string", required: true},
            order: {type: "number"},
        },
    },
    {
        name: "HistoryActionsAP",
        primaryKey: "id",
        attributes: {
            id: {type: "number"},
            modelId: {type: "string", required: true},
            modelName: {type: "string", required: true},
            action: {type: "string"},
            data: {type: "json"},
            diff: {type: "json"},
            user: {relation: {kind: "one", target: "UserAP"}},
            isCurrent: {type: "boolean"},
            createdAt: {type: "string"},
            updatedAt: {type: "string"},
            preview: {type: "boolean"},
        },
    },
    {
        name: "NotificationAP",
        primaryKey: "id",
        attributes: {
            id: {type: "number"},
            title: {type: "string"},
            message: {type: "string"},
            notificationClass: {type: "string"},
            channel: {type: "string"},
            metadata: {type: "json"},
            createdAt: {type: "string"},
            updatedAt: {type: "string"},
        },
    },
    {
        name: "UserNotificationAP",
        primaryKey: "id",
        attributes: {
            id: {type: "number"},
            userId: {type: "number", required: true},
            notificationId: {relation: {kind: "one", target: "NotificationAP"}},
            read: {type: "boolean"},
        },
    },
];

export function validateSystemModelContract(
    model: AbstractModel<any>,
    contract: SystemModelContract
): void {
    const errors: string[] = [];

    if (model.primaryKey.toLowerCase() !== contract.primaryKey.toLowerCase()) {
        errors.push(`primary key must be "${contract.primaryKey}", received "${model.primaryKey}"`);
    }

    for (const [attributeName, expected] of Object.entries(contract.attributes)) {
        const actual = model.attributes[attributeName];
        if (!actual) {
            errors.push(`attribute "${attributeName}" is missing`);
            continue;
        }

        if (expected.type && actual.type !== expected.type) {
            errors.push(`attribute "${attributeName}" must have type "${expected.type}", received "${actual.type}"`);
        }
        if (expected.required === true && actual.required !== true) {
            errors.push(`attribute "${attributeName}" must be required`);
        }
        if (expected.columnName && actual.columnName?.toLowerCase() !== expected.columnName.toLowerCase()) {
            errors.push(
                `attribute "${attributeName}" must use column "${expected.columnName}", received "${actual.columnName}"`
            );
        }
        if (expected.relation) {
            const expectedType = expected.relation.kind === "many" ? "association-many" : "association";
            const actualTarget = actual.model ?? actual.collection;
            if (actual.type !== expectedType) {
                errors.push(`association "${attributeName}" must have kind "${expected.relation.kind}"`);
            }
            if (actualTarget?.toLowerCase() !== expected.relation.target.toLowerCase()) {
                errors.push(
                    `association "${attributeName}" must target "${expected.relation.target}", received "${actualTarget}"`
                );
            }
        }
    }

    if (errors.length) {
        throw new Error(
            `System model "${contract.name}" does not satisfy the Adminizer contract:\n- ${errors.join("\n- ")}`
        );
    }
}
