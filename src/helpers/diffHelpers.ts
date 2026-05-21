export function sanitizeForDiff(data: any): any {
    if (!data) return {};

    const result = {...data};

    // Removing system fields
    const systemFields = ['id', 'createdAt', 'updatedAt', 'deletedAt', '__v', '_id'];
    systemFields.forEach(field => delete result[field]);

    // Cleaning sensitive data
    // TODO: Place in environment variables or config & put in docs
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
    sensitiveFields.forEach(field => {
        if (result[field] !== undefined) {
            result[field] = '***HIDDEN***';
        }
    });

    return result;
}

export function formatChanges(diffObj: any, oldData: any, newData: any, operation?: 'add' | 'remove' | 'update'): any[] {
    const changes = [];

    // Special handling for append operation
    if (operation === 'add') {
        for (const [key, value] of Object.entries(newData)) {
            if (value === '***HIDDEN***') continue;

            changes.push({
                field: key,
                oldValue: undefined,
                newValue: value,
                type: typeof value,
                operation: 'add'
            });
        }
        return changes;
    }

    // Standard handling for remove and update
    for (const [key, value] of Object.entries(diffObj)) {
        // For added fields (when oldData[key] is undefined)
        if (oldData[key] === undefined && newData[key] !== undefined) {
            changes.push({
                field: key,
                oldValue: undefined,
                newValue: newData[key],
                type: 'added',
                operation: 'add'
            });
        }
        // For removed fields (when newData[key] is undefined)
        else if (newData[key] === undefined && oldData[key] !== undefined) {
            changes.push({
                field: key,
                oldValue: oldData[key],
                newValue: undefined,
                type: 'deleted',
                operation: 'remove'
            });
        }
        // For changed fields
        else {
            changes.push({
                field: key,
                oldValue: oldData[key],
                newValue: newData[key],
                type: typeof value,
                operation: 'update'
            });
        }
    }

    return changes;
}