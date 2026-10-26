import type { User } from "../models/User";

/**
 * Fields of a user record that must never reach the browser: the password
 * hash and the personal API key. Shared Inertia props end up in the HTML of
 * every page, in saved pages, HAR files and caches.
 */
const PRIVATE_USER_FIELDS = ["passwordHashed", "apiKey"] as const;

/** The user as the client may see it: the record without its secrets. */
export function toPublicUser<T extends Partial<User>>(user: T | null | undefined): Omit<T, typeof PRIVATE_USER_FIELDS[number]> | null {
    if (!user) return null;
    const publicUser = {...user};
    for (const field of PRIVATE_USER_FIELDS) delete publicUser[field];
    return publicUser;
}
