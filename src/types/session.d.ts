// Type definitions for express-session extension
import 'express-session';
import type { FilterCondition } from '../models/Filter';
import type { FilterColumn } from '../models/FilterColumn';

declare module 'express-session' {
    interface SessionData {
        temporaryFilters?: Record<string, {
            name: string;
            conditions: FilterCondition[];
            columns?: FilterColumn[] | undefined;
        }>;
    }
}
