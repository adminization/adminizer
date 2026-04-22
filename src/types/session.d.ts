// Type definitions for express-session extension
import 'express-session';

declare module 'express-session' {
    interface SessionData {
        temporaryFilters?: Record<string, {
            name: string;
            conditions: any[];
            columns?: any[] | null;
        }>;
    }
}
