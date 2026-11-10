import {createHash} from "crypto";

/**
 * "Pretend to be a user": which auth token is currently acting as which user.
 *
 * Kept in a variable of the process on purpose, not in the session: the session cookie
 * is not issued behind a proxy that terminates https, so a session lives for one request
 * there. The price is that the mark is gone after a restart (the administrator is simply
 * back under their own account) and is not shared between several workers.
 *
 * Keyed by the token, not by the administrator: pretending in one browser must not
 * switch the other logins of the same administrator.
 */
const pretendedByToken = new Map<string, number>();

/** The token itself is not kept in memory, only its digest. */
function keyOf(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

export function setPretendedUserId(token: string, userId: number): void {
    pretendedByToken.set(keyOf(token), userId);
}

export function getPretendedUserId(token: string | undefined): number | undefined {
    return token ? pretendedByToken.get(keyOf(token)) : undefined;
}

/** Returns whether the token was pretending. */
export function clearPretendedUserId(token: string | undefined): boolean {
    return token ? pretendedByToken.delete(keyOf(token)) : false;
}
