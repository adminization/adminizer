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

export const SYSTEM_MODEL_NAMES = [
    "User",
    "Group",
    "Filter",
    "FilterColumn",
    "HistoryActions",
    "Notification",
    "UserNotification",
] as const;

export type SystemModelName = typeof SYSTEM_MODEL_NAMES[number];

export interface ValidateSystemModelContractOptions {
    resolveRelationTarget?: (target: string) => string;
}

export const SYSTEM_MODEL_CONTRACTS: readonly SystemModelContract[] = [
    {
        name: "User",
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
            groups: {relation: {kind: "many", target: "Group"}},
            widgets: {type: "json"},
            isConfirmed: {type: "boolean"},
            apiKey: {type: "string", columnName: "userApiKey"},
        },
    },
    {
        name: "Group",
        primaryKey: "id",
        attributes: {
            id: {type: "number"},
            name: {type: "string", required: true},
            description: {type: "string"},
            tokens: {type: "json"},
            users: {relation: {kind: "many", target: "User"}},
        },
    },
    {
        name: "Filter",
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
            columns: {relation: {kind: "many", target: "FilterColumn"}},
            createdAt: {type: "date"},
            updatedAt: {type: "date"},
        },
    },
    {
        name: "FilterColumn",
        primaryKey: "id",
        attributes: {
            id: {type: "number"},
            filter: {relation: {kind: "one", target: "Filter"}},
            fieldName: {type: "string", required: true},
            order: {type: "number"},
        },
    },
    {
        name: "HistoryActions",
        primaryKey: "id",
        attributes: {
            id: {type: "number"},
            modelId: {type: "string", required: true},
            modelName: {type: "string", required: true},
            action: {type: "string"},
            data: {type: "json"},
            diff: {type: "json"},
            user: {relation: {kind: "one", target: "User"}},
            isCurrent: {type: "boolean"},
            createdAt: {type: "date"},
            updatedAt: {type: "date"},
            preview: {type: "boolean"},
        },
    },
    {
        name: "Notification",
        primaryKey: "id",
        attributes: {
            id: {type: "number"},
            title: {type: "string"},
            message: {type: "string"},
            notificationClass: {type: "string"},
            channel: {type: "string"},
            metadata: {type: "json"},
            createdAt: {type: "date"},
            updatedAt: {type: "date"},
        },
    },
    {
        name: "UserNotification",
        primaryKey: "id",
        attributes: {
            id: {type: "number"},
            userId: {type: "number", required: true},
            notificationId: {relation: {kind: "one", target: "Notification"}},
            read: {type: "boolean"},
        },
    },
];

export function validateSystemModelContract(
    model: AbstractModel<any>,
    contract: SystemModelContract,
    options: ValidateSystemModelContractOptions = {}
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

        // Before `date` existed, temporal columns were reported as `string`.
        // Keep accepting that from third-party adapters that have not been updated.
        const typeMatches = expected.type === actual.type
            || (expected.type === "date" && actual.type === "string");

        if (expected.type && !typeMatches) {
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
            const resolvedActualTarget = actualTarget ? options.resolveRelationTarget?.(actualTarget) ?? actualTarget : actualTarget;
            if (actual.type !== expectedType) {
                errors.push(`association "${attributeName}" must have kind "${expected.relation.kind}"`);
            }
            if (resolvedActualTarget?.toLowerCase() !== expected.relation.target.toLowerCase()) {
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
