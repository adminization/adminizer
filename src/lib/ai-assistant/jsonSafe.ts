/**
 * Converts arbitrary values (ORM records, Dates, Buffers, cyclic graphs) into
 * plain JSON data.
 *
 * Tool results are stored verbatim in the agent's message history and are
 * re-validated by the AI SDK against its `ModelMessage[]` schema on every
 * subsequent turn. A single non-JSON value — a `Date` from a Sequelize record,
 * for example — therefore does not fail the call that produced it: it poisons
 * the session and every later turn dies with `Invalid prompt: The messages do
 * not match the ModelMessage[] schema`. Passing tool output through this
 * helper keeps that class of failure out of the history.
 */

const MAX_DEPTH = 12;

export function toJsonSafe<T>(value: T): unknown {
    return convert(value, new WeakSet<object>(), 0);
}

function convert(value: unknown, seen: WeakSet<object>, depth: number): unknown {
    if (value === null) return null;

    switch (typeof value) {
        case 'string':
        case 'boolean':
            return value;
        case 'number':
            return Number.isFinite(value) ? value : null;
        case 'bigint':
            return value.toString();
        case 'undefined':
        case 'function':
        case 'symbol':
            return undefined;
    }

    const object = value as object;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
    if (value instanceof Error) return value.message;
    if (value instanceof RegExp) return value.toString();
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) return `<binary ${value.length} bytes>`;
    if (ArrayBuffer.isView(value)) return `<binary ${(value as ArrayBufferView).byteLength} bytes>`;
    if (value instanceof ArrayBuffer) return `<binary ${value.byteLength} bytes>`;

    if (seen.has(object)) return '[Circular]';
    if (depth >= MAX_DEPTH) return '[MaxDepth]';
    seen.add(object);
    try {
        if (Array.isArray(value)) {
            // JSON.stringify turns array holes and `undefined` items into null.
            return value.map((item) => {
                const converted = convert(item, seen, depth + 1);
                return converted === undefined ? null : converted;
            });
        }
        if (value instanceof Set) return convert([...value], seen, depth);
        if (value instanceof Map) {
            return convert(Object.fromEntries([...value].map(([key, item]) => [String(key), item])), seen, depth);
        }

        // Sequelize instances, Decimal, Luxon and friends: let them describe
        // themselves first, then normalize whatever they produced.
        const toJSON = (value as {toJSON?: unknown}).toJSON;
        if (typeof toJSON === 'function') {
            return convert(toJSON.call(value), seen, depth + 1);
        }

        const result: Record<string, unknown> = {};
        for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
            const converted = convert(item, seen, depth + 1);
            if (converted !== undefined) result[key] = converted;
        }
        return result;
    } finally {
        seen.delete(object);
    }
}
