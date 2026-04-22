import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Sequelize } from 'sequelize-typescript';
import { Example as ExampleSequelize } from '../fixture/models/sequelize/Example';
import { Test as TestSequelize } from '../fixture/models/sequelize/Test';
import { JsonSchema as JsonSchemaSequelize } from '../fixture/models/sequelize/JsonSchema';
import { Category as CategorySequelize } from '../fixture/models/sequelize/Category';
import { TestCatalog as TestCatalogSequelize } from '../fixture/models/sequelize/TestCatalog';
import { SequelizeAdapter } from '../src/lib/model/adapter/sequelize';
import { ModernQueryBuilder, QueryParams } from '../src/lib/query-builder/ModernQueryBuilder';
import { FilterCondition } from '../src/models/FilterAP';
import { Fields } from '../src/helpers/fieldsHelper';
import { seedDatabase } from '../fixture/helpers/seedDatabase';
import path from 'path';
import fs from 'fs/promises';
import { Op } from 'sequelize';
import { ConditionValidator } from '../src/lib/filters/ConditionValidator';
import { ExampleDatatablePriceRangeFilterHandler } from '../fixture/filters/customFilterHandlers';

/**
 * Integration tests for Example model filters with Sequelize + SQLite
 * 
 * Tests focus on:
 * - Boolean field `sort` filtering (main issue)
 * - All operator types (eq, neq, gt, gte, lt, lte, like, in, between, isNull, etc.)
 * - Combined filters (AND, OR, NOT)
 * - Nested condition groups
 * - Edge cases
 */
describe('Example Model Filters - Sequelize Integration', () => {
    let sequelize: Sequelize;
    let exampleModel: any;
    let fields: Fields;
    let dbPath: string;

    beforeAll(async () => {
        // Create unique db path for test isolation
        dbPath = path.join(process.cwd(), '.tmp', `test_example_filters_${Date.now()}.sqlite`);
        const dbDir = path.dirname(dbPath);
        await fs.mkdir(dbDir, { recursive: true });

        // Initialize Sequelize with SQLite
        sequelize = new Sequelize({
            dialect: 'sqlite',
            storage: dbPath,
            logging: false,
        });

        await sequelize.authenticate();

        // Register models
        await SequelizeAdapter.registerSystemModels(sequelize, false);
        sequelize.addModels([
            ExampleSequelize,
            TestSequelize,
            JsonSchemaSequelize,
            CategorySequelize,
            TestCatalogSequelize
        ]);
        
        // Set up associations
        TestSequelize.associate(sequelize);
        ExampleSequelize.associate(sequelize);

        await sequelize.sync({ force: true });

        // Seed database with test data
        await seedDatabase(sequelize.models, 77);

        // Get example model directly from Sequelize
        exampleModel = sequelize.models['Example'];

        // Define fields configuration (matching adminizerConfig.ts)
        fields = {
            title: { model: { type: 'string' }, config: { type: 'string' }, populated: undefined },
            description: { model: { type: 'text' }, config: { type: 'text' }, populated: undefined },
            sort: { model: { type: 'boolean' }, config: { type: 'boolean' }, populated: undefined },
            number: { model: { type: 'number' }, config: { type: 'number' }, populated: undefined },
            range: { model: { type: 'number' }, config: { type: 'range' }, populated: undefined },
            date: { model: { type: 'date' }, config: { type: 'date' }, populated: undefined },
            datetime: { model: { type: 'datetime' }, config: { type: 'datetime' }, populated: undefined },
            time: { model: { type: 'string' }, config: { type: 'time' }, populated: undefined },
            color: { model: { type: 'string' }, config: { type: 'color' }, populated: undefined },
            select: { model: { type: 'string' }, config: { type: 'select' }, populated: undefined },
            selectMany: { model: { type: 'json' }, config: { type: 'select-many' }, populated: undefined },
            json: { model: { type: 'json' }, config: { type: 'jsoneditor' }, populated: undefined },
            code: { model: { type: 'string' }, config: { type: 'code' }, populated: undefined },
            editor: { model: { type: 'text' }, config: { type: 'wysiwyg' }, populated: undefined },
        };
    });

    afterAll(async () => {
        // Cleanup
        if (sequelize) {
            await sequelize.close();
        }
        // Remove test database file
        try {
            if (dbPath) {
                await fs.unlink(dbPath);
            }
        } catch (e) {
            // Ignore if file doesn't exist
        }
    });

    describe('1. Boolean field `sort` - WHERE clause generation', () => {
        it('should generate WHERE sort = true for sort eq true', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [{
                id: 'test-1',
                field: 'sort',
                operator: 'eq',
                value: true
            }];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            // Verify WHERE clause has correct boolean value
            expect(whereClause.sort).toBe(true);
        });

        it('should generate WHERE sort = false for sort eq false', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [{
                id: 'test-2',
                field: 'sort',
                operator: 'eq',
                value: false
            }];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause.sort).toBe(false);
        });

        it('should generate WHERE sort != true for sort neq true', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [{
                id: 'test-3',
                field: 'sort',
                operator: 'neq',
                value: true
            }];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause.sort).toEqual({ [Op.ne]: true });
        });

        it('should generate WHERE sort != false for sort neq false', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [{
                id: 'test-4',
                field: 'sort',
                operator: 'neq',
                value: false
            }];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause.sort).toEqual({ [Op.ne]: false });
        });

        it('should generate WHERE sort IN (true, false) for sort in [true, false]', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [{
                id: 'test-5',
                field: 'sort',
                operator: 'in',
                value: [true, false]
            }];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause.sort).toEqual({ [Op.in]: [true, false] });
        });

        it('should convert string "true" to boolean true for eq operator', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [{
                id: 'test-6',
                field: 'sort',
                operator: 'eq',
                value: 'true'
            }];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause.sort).toBe(true);
        });

        it('should convert string "false" to boolean false for eq operator', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [{
                id: 'test-7',
                field: 'sort',
                operator: 'eq',
                value: 'false'
            }];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause.sort).toBe(false);
        });
    });

    describe('2. String fields - WHERE clause generation', () => {
        it('should generate WHERE title = value for eq operator', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [{
                id: 'test-str-1',
                field: 'title',
                operator: 'eq',
                value: 'Test Title'
            }];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause.title).toBe('Test Title');
        });

        it('should generate WHERE title LIKE %value% for like operator', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [{
                id: 'test-str-2',
                field: 'title',
                operator: 'like',
                value: 'test'
            }];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause.title).toEqual({ [Op.like]: '%test%' });
        });

        it('should generate WHERE title LIKE value% for startsWith operator', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [{
                id: 'test-str-3',
                field: 'title',
                operator: 'startsWith',
                value: 'Test'
            }];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause.title).toEqual({ [Op.like]: 'Test%' });
        });

        it('should generate WHERE title LIKE %value for endsWith operator', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [{
                id: 'test-str-4',
                field: 'title',
                operator: 'endsWith',
                value: 'Title'
            }];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause.title).toEqual({ [Op.like]: '%Title' });
        });

        it('should generate WHERE title IN (...) for in operator', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [{
                id: 'test-str-5',
                field: 'title',
                operator: 'in',
                value: ['Title1', 'Title2', 'Title3']
            }];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause.title).toEqual({ [Op.in]: ['Title1', 'Title2', 'Title3'] });
        });

        it('should generate WHERE title IS NULL for isNull operator', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [{
                id: 'test-str-6',
                field: 'title',
                operator: 'isNull'
            }];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause.title).toBeNull();
        });

        it('should generate WHERE title IS NOT NULL for isNotNull operator', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [{
                id: 'test-str-7',
                field: 'title',
                operator: 'isNotNull'
            }];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause).toHaveProperty('not');
            expect(whereClause.not).toHaveProperty('title', null);
        });
    });

    describe('3. Integer fields - WHERE clause generation', () => {
        it('should generate WHERE number = value for eq operator', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [{
                id: 'test-int-1',
                field: 'number',
                operator: 'eq',
                value: 42
            }];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause.number).toBe(42);
        });

        it('should generate WHERE number > value for gt operator', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [{
                id: 'test-int-2',
                field: 'number',
                operator: 'gt',
                value: 10
            }];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause.number).toEqual({ [Op.gt]: 10 });
        });

        it('should generate WHERE number >= value for gte operator', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [{
                id: 'test-int-3',
                field: 'number',
                operator: 'gte',
                value: 10
            }];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause.number).toEqual({ [Op.gte]: 10 });
        });

        it('should generate WHERE number < value for lt operator', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [{
                id: 'test-int-4',
                field: 'number',
                operator: 'lt',
                value: 100
            }];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause.number).toEqual({ [Op.lt]: 100 });
        });

        it('should generate WHERE number <= value for lte operator', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [{
                id: 'test-int-5',
                field: 'number',
                operator: 'lte',
                value: 100
            }];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause.number).toEqual({ [Op.lte]: 100 });
        });

        it('should generate WHERE number BETWEEN ... AND ... for between operator', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [{
                id: 'test-int-6',
                field: 'number',
                operator: 'between',
                value: [10, 100]
            }];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause.number).toEqual({ [Op.between]: [10, 100] });
        });

        it('should generate WHERE number IN (...) for in operator', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [{
                id: 'test-int-7',
                field: 'number',
                operator: 'in',
                value: [1, 2, 3, 4, 5]
            }];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause.number).toEqual({ [Op.in]: [1, 2, 3, 4, 5] });
        });
    });

    describe('4. Date fields - WHERE clause generation', () => {
        it('should generate WHERE date > value for gt operator', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [{
                id: 'test-date-1',
                field: 'date',
                operator: 'gt',
                value: '2024-01-01'
            }];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause.date).toEqual({ [Op.gt]: '2024-01-01' });
        });

        it('should generate WHERE date BETWEEN ... AND ... for between operator', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [{
                id: 'test-date-2',
                field: 'date',
                operator: 'between',
                value: ['2024-01-01', '2024-12-31']
            }];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause.date).toEqual({ [Op.between]: ['2024-01-01', '2024-12-31'] });
        });
    });

    describe('4.1 Relation fields - WHERE clause generation', () => {
        it('should generate WHERE $owner.login$ = value for relation eq operator', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);

            const conditions: FilterCondition[] = [{
                id: 'test-rel-1',
                relation: 'owner',
                relationField: 'login',
                operator: 'eq',
                value: 'admin'
            }];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause['$owner.login$']).toBe('admin');
        });

        it('should generate WHERE $owner.login$ != value for relation neq operator', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);

            const conditions: FilterCondition[] = [{
                id: 'test-rel-2',
                relation: 'owner',
                relationField: 'login',
                operator: 'neq',
                value: 'admin'
            }];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause['$owner.login$']).toEqual({ [Op.ne]: 'admin' });
        });
    });

    describe('5. Combined filters - AND logic', () => {
        it('should generate WHERE sort = true AND title = value', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [
                {
                    id: 'test-and-1a',
                    field: 'sort',
                    operator: 'eq',
                    value: true
                },
                {
                    id: 'test-and-1b',
                    field: 'title',
                    operator: 'eq',
                    value: 'Test Title'
                }
            ];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause[Op.and]).toBeDefined();
            expect(whereClause[Op.and]).toHaveLength(2);
            expect(whereClause[Op.and][0].sort).toBe(true);
            expect(whereClause[Op.and][1].title).toBe('Test Title');
        });

        it('should generate WHERE sort = false AND number > value', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [
                {
                    id: 'test-and-2a',
                    field: 'sort',
                    operator: 'eq',
                    value: false
                },
                {
                    id: 'test-and-2b',
                    field: 'number',
                    operator: 'gt',
                    value: 100
                }
            ];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause[Op.and]).toBeDefined();
            expect(whereClause[Op.and]).toHaveLength(2);
            expect(whereClause[Op.and][0].sort).toBe(false);
            expect(whereClause[Op.and][1].number).toEqual({ [Op.gt]: 100 });
        });

        it('should generate WHERE number > 5 AND range < 100', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [
                {
                    id: 'test-and-3a',
                    field: 'number',
                    operator: 'gt',
                    value: 5
                },
                {
                    id: 'test-and-3b',
                    field: 'range',
                    operator: 'lt',
                    value: 100
                }
            ];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause[Op.and]).toBeDefined();
            expect(whereClause[Op.and][0].number).toEqual({ [Op.gt]: 5 });
            expect(whereClause[Op.and][1].range).toEqual({ [Op.lt]: 100 });
        });
    });

    describe('6. Combined filters - OR logic', () => {
        it('should generate WHERE sort = true OR sort = false', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [{
                id: 'test-or-1',
                logic: 'OR',
                children: [
                    {
                        id: 'test-or-1a',
                        field: 'sort',
                        operator: 'eq',
                        value: true
                    },
                    {
                        id: 'test-or-1b',
                        field: 'sort',
                        operator: 'eq',
                        value: false
                    }
                ]
            }];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause[Op.or]).toBeDefined();
            expect(whereClause[Op.or]).toHaveLength(2);
            expect(whereClause[Op.or][0].sort).toBe(true);
            expect(whereClause[Op.or][1].sort).toBe(false);
        });

        it('should generate WHERE sort = true OR title = value', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [{
                id: 'test-or-2',
                logic: 'OR',
                children: [
                    {
                        id: 'test-or-2a',
                        field: 'sort',
                        operator: 'eq',
                        value: true
                    },
                    {
                        id: 'test-or-2b',
                        field: 'title',
                        operator: 'eq',
                        value: 'Test Title'
                    }
                ]
            }];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause[Op.or]).toBeDefined();
            expect(whereClause[Op.or][0].sort).toBe(true);
            expect(whereClause[Op.or][1].title).toBe('Test Title');
        });
    });

    describe('7. NOT filters', () => {
        it('should generate WHERE NOT (sort = true)', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [{
                id: 'test-not-1',
                logic: 'NOT',
                children: [
                    {
                        id: 'test-not-1a',
                        field: 'sort',
                        operator: 'eq',
                        value: true
                    }
                ]
            }];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause[Op.not]).toBeDefined();
            expect(whereClause[Op.not].sort).toBe(true);
        });

        it('should generate WHERE NOT (number > 100)', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [{
                id: 'test-not-2',
                logic: 'NOT',
                children: [
                    {
                        id: 'test-not-2a',
                        field: 'number',
                        operator: 'gt',
                        value: 100
                    }
                ]
            }];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause[Op.not]).toBeDefined();
            expect(whereClause[Op.not].number).toEqual({ [Op.gt]: 100 });
        });
    });

    describe('8. Nested condition groups', () => {
        it('should generate WHERE (sort = true OR number > 200) AND title LIKE %test%', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [
                {
                    id: 'test-nested-1a',
                    logic: 'OR',
                    children: [
                        {
                            id: 'test-nested-1a1',
                            field: 'sort',
                            operator: 'eq',
                            value: true
                        },
                        {
                            id: 'test-nested-1a2',
                            field: 'number',
                            operator: 'gt',
                            value: 200
                        }
                    ]
                },
                {
                    id: 'test-nested-1b',
                    field: 'title',
                    operator: 'like',
                    value: 'test'
                }
            ];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause[Op.and]).toBeDefined();
            expect(whereClause[Op.and]).toHaveLength(2);
            expect(whereClause[Op.and][0][Op.or]).toBeDefined();
            expect(whereClause[Op.and][1].title).toEqual({ [Op.like]: '%test%' });
        });

        it('should generate WHERE sort = true AND (number > 100 OR range < 50)', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [
                {
                    id: 'test-nested-2a',
                    field: 'sort',
                    operator: 'eq',
                    value: true
                },
                {
                    id: 'test-nested-2b',
                    logic: 'OR',
                    children: [
                        {
                            id: 'test-nested-2b1',
                            field: 'number',
                            operator: 'gt',
                            value: 100
                        },
                        {
                            id: 'test-nested-2b2',
                            field: 'range',
                            operator: 'lt',
                            value: 50
                        }
                    ]
                }
            ];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause[Op.and]).toBeDefined();
            expect(whereClause[Op.and][0].sort).toBe(true);
            expect(whereClause[Op.and][1][Op.or]).toBeDefined();
        });
    });

    describe('9. Edge cases', () => {
        it('should return empty WHERE clause for empty filters', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: []
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause).toEqual({});
        });

        it('should handle filter with value = 0 for integer', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [{
                id: 'test-edge-1',
                field: 'number',
                operator: 'eq',
                value: 0
            }];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause.number).toBe(0);
        });

        it('should handle filter with value = 1 for integer', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [{
                id: 'test-edge-2',
                field: 'number',
                operator: 'eq',
                value: 1
            }];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            expect(whereClause.number).toBe(1);
        });

        it('should handle filter with empty string value', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);
            
            const conditions: FilterCondition[] = [{
                id: 'test-edge-3',
                field: 'title',
                operator: 'eq',
                value: ''
            }];

            const queryParams: QueryParams = {
                page: 1,
                limit: 10,
                filters: conditions
            };

            const whereClause = (qb as any).buildWhereClause(queryParams);

            // Empty string should be filtered out
            expect(whereClause).toEqual({});
        });
    });

    describe('10. Custom handler conditions', () => {
        it('should treat custom condition as valid without field name', () => {
            const qb = new ModernQueryBuilder(exampleModel, fields, null as any);

            const isValid = (qb as any).isValidCondition({
                id: 'test-custom-1',
                customHandler: 'Example.json',
                operator: 'custom',
                value: 'needle'
            });

            expect(isValid).toBe(true);
        });

        it('should validate custom condition without field and reject empty value', () => {
            const validator = new ConditionValidator({});
            const result = validator.validate([
                {
                    id: 'test-custom-2',
                    customHandler: 'Example.json',
                    operator: 'custom',
                    value: ''
                }
            ]);

            expect(result.valid).toBe(false);
            expect(result.errors[0]?.message).toBe('Value is required for custom filter');
        });

        it('should reject custom condition with empty object value', () => {
            const validator = new ConditionValidator({});
            const result = validator.validate([
                {
                    id: 'test-custom-3',
                    customHandler: 'Example.datatable',
                    operator: 'custom',
                    value: { from: '', to: '' }
                }
            ]);

            expect(result.valid).toBe(false);
            expect(result.errors[0]?.message).toBe('Value is required for custom filter');
        });

        it('should allow custom condition with object value', () => {
            const validator = new ConditionValidator({});
            const result = validator.validate([
                {
                    id: 'test-custom-4',
                    customHandler: 'Example.datatable',
                    operator: 'custom',
                    value: { from: '100', to: '' }
                }
            ]);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should normalize comma decimal values for datatable price range', () => {
            const handler = new ExampleDatatablePriceRangeFilterHandler();
            const condition = handler.buildCondition({
                from: '316,5',
                to: '692,25'
            });

            const sql = (condition.criteria as any)?.val || '';
            expect(sql).toContain('>= 316.5');
            expect(sql).toContain('<= 692.25');
        });

        it('should swap bounds when "from" is greater than "to"', () => {
            const handler = new ExampleDatatablePriceRangeFilterHandler();
            const condition = handler.buildCondition({
                from: '700',
                to: '300'
            });

            const sql = (condition.criteria as any)?.val || '';
            expect(sql).toContain('>= 300');
            expect(sql).toContain('<= 700');
        });
    });
});
