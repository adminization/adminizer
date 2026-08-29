/**
 * Memoization shared by every record-access resolver of one request.
 *
 * A single page builds several `DataAccessor`s — the list itself plus one per association
 * dropdown — and each would otherwise repeat the same membership and group lookups. The
 * cache is deliberately short-lived: it is created per request (or per accessor, when the
 * caller does not supply one) and never outlives it, because a stale access decision is far more
 * dangerous than a repeated query.
 *
 * Every key carries the user id and the action verb, so sharing one instance between the
 * accessors of a page can never hand one user's decision to another, nor a read decision to
 * a write. What is stored is the promise rather than its value: concurrent callers coalesce
 * onto a single lookup, and a rejection likewise stays cached for the rest of the request.
 */
export class RecordAccessCache {
    private readonly entries = new Map<string, Promise<unknown>>();

    /**
     * Runs `factory` once per key; every later caller awaits the promise of the first one.
     * Keys are opaque strings owned by the resolvers, which prefix them by kind (`membership:`,
     * `graph:`) to keep the namespaces of the two record-access paths apart.
     */
    resolve<T>(key: string, factory: () => Promise<T>): Promise<T> {
        let pending = this.entries.get(key) as Promise<T> | undefined;
        if (pending === undefined) {
            pending = factory();
            this.entries.set(key, pending as Promise<unknown>);
        }
        return pending;
    }
}
