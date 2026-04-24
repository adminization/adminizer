// Type definitions for express-session extension
import 'express-session';
import type { FilterCondition } from '../models/FilterAP';
import type { FilterColumnAP } from '../models/FilterColumnAP';

declare module 'express-session' {
    interface SessionData {
        temporaryFilters?: Record<string, {
            name: string;
            conditions: FilterCondition[];
            columns?: FilterColumnAP[] | undefined;
        }>;
    }
}
