import { randomUUID } from "crypto";

/**
 * Generates a unique API key for user authentication.
 * @returns A UUID string representing the user's API key.
 */
export function generateUserApiKey(): string {
    return randomUUID();
}
