/**
 * Test to debug boolean handling in Sequelize + SQLite
 * This test shows what SQL is generated for boolean filters
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Sequelize } from 'sequelize-typescript';
import { Op } from 'sequelize';
import path from 'path';
import fs from 'fs/promises';
import { Example as ExampleSequelize } from '../fixture/models/sequelize/Example';
import { Test as TestSequelize } from '../fixture/models/sequelize/Test';
import { JsonSchema as JsonSchemaSequelize } from '../fixture/models/sequelize/JsonSchema';
import { Category as CategorySequelize } from '../fixture/models/sequelize/Category';
import { TestCatalog as TestCatalogSequelize } from '../fixture/models/sequelize/TestCatalog';
import { SequelizeAdapter } from '../src/lib/model/adapter/sequelize';
import { seedDatabase } from '../fixture/helpers/seedDatabase';

describe('Sequelize SQLite Boolean Debug Test', () => {
    let sequelize: Sequelize;
    let dbPath: string;

    beforeAll(async () => {
        dbPath = path.join(process.cwd(), '.tmp', `test_boolean_debug_${Date.now()}.sqlite`);
        const dbDir = path.dirname(dbPath);
        await fs.mkdir(dbDir, { recursive: true });

        sequelize = new Sequelize({
            dialect: 'sqlite',
            storage: dbPath,
            logging: (sql: string) => {
                console.log('[Sequelize SQL]', sql);
            },
        });

        await SequelizeAdapter.registerSystemModels(sequelize, false);
        sequelize.addModels([
            ExampleSequelize,
            TestSequelize,
            JsonSchemaSequelize,
            CategorySequelize,
            TestCatalogSequelize
        ]);
        
        TestSequelize.associate(sequelize);
        ExampleSequelize.associate(sequelize);

        await sequelize.sync({ force: true });

        // Seed test data
        await seedDatabase(sequelize.models, 77);
    });

    afterAll(async () => {
        if (sequelize) {
            await sequelize.close();
        }
        try {
            if (dbPath) await fs.unlink(dbPath);
        } catch (e) {
            // ignore
        }
    });

    describe('Boolean WHERE clause generation on Example model', () => {
        it('Test 1: WHERE { sort: true } (direct boolean)', async () => {
            console.log('\n=== Test 1: WHERE { sort: true } ===');
            const results = await ExampleSequelize.findAll({
                where: { sort: true }
            });
            console.log('Results count:', results.length);
            console.log('All sort=true?', results.every(r => r.sort === true));
            expect(results.every(r => r.sort === true)).toBe(true);
        });

        it('Test 2: WHERE { sort: false } (direct boolean)', async () => {
            console.log('\n=== Test 2: WHERE { sort: false } ===');
            const results = await ExampleSequelize.findAll({
                where: { sort: false }
            });
            console.log('Results count:', results.length);
            console.log('All sort=false?', results.every(r => r.sort === false));
            expect(results.every(r => r.sort === false)).toBe(true);
        });

        it('Test 3: WHERE { sort: { [Op.eq]: true } } (Op.eq)', async () => {
            console.log('\n=== Test 3: WHERE { sort: { [Op.eq]: true } } ===');
            const results = await ExampleSequelize.findAll({
                where: { sort: { [Op.eq]: true } }
            });
            console.log('Results count:', results.length);
            expect(results.every(r => r.sort === true)).toBe(true);
        });

        it('Test 4: WHERE { sort: { [Op.eq]: false } } (Op.eq)', async () => {
            console.log('\n=== Test 4: WHERE { sort: { [Op.eq]: false } } ===');
            const results = await ExampleSequelize.findAll({
                where: { sort: { [Op.eq]: false } }
            });
            console.log('Results count:', results.length);
            expect(results.every(r => r.sort === false)).toBe(true);
        });

        it('Test 5: WHERE { sort: { [Op.ne]: true } } (Op.ne)', async () => {
            console.log('\n=== Test 5: WHERE { sort: { [Op.ne]: true } } ===');
            const results = await ExampleSequelize.findAll({
                where: { sort: { [Op.ne]: true } }
            });
            console.log('Results count:', results.length);
            expect(results.every(r => r.sort === false)).toBe(true);
        });

        it('Test 6: WHERE { sort: { [Op.in]: [true, false] } } (Op.in)', async () => {
            console.log('\n=== Test 6: WHERE { sort: { [Op.in]: [true, false] } } ===');
            const results = await ExampleSequelize.findAll({
                where: { sort: { [Op.in]: [true, false] } }
            });
            console.log('Results count:', results.length);
            expect(results.length).toBeGreaterThan(0);
        });

        it('Test 7: WHERE { sort: 1 } (integer)', async () => {
            console.log('\n=== Test 7: WHERE { sort: 1 } ===');
            const results = await ExampleSequelize.findAll({
                where: { sort: 1 }
            });
            console.log('Results count:', results.length);
            expect(results.every(r => r.sort === true)).toBe(true);
        });

        it('Test 8: WHERE { sort: 0 } (integer)', async () => {
            console.log('\n=== Test 8: WHERE { sort: 0 } ===');
            const results = await ExampleSequelize.findAll({
                where: { sort: 0 }
            });
            console.log('Results count:', results.length);
            expect(results.every(r => r.sort === false)).toBe(true);
        });

        it('Test 9: WHERE { sort: "true" } (string)', async () => {
            console.log('\n=== Test 9: WHERE { sort: "true" } ===');
            const results = await ExampleSequelize.findAll({
                where: { sort: 'true' }
            });
            console.log('Results count:', results.length);
            console.log('WARNING: String "true" may not work correctly!');
        });

        it('Test 10: AND combination with boolean', async () => {
            console.log('\n=== Test 10: AND combination ===');
            // First get any record with sort=true
            const allRecords = await ExampleSequelize.findAll({ where: { sort: true }, limit: 1 });
            if (allRecords.length === 0) {
                console.log('No records with sort=true, skipping');
                return;
            }
            
            const sampleTitle = allRecords[0].title;
            console.log('Sample title:', sampleTitle);
            
            const results = await ExampleSequelize.findAll({
                where: {
                    [Op.and]: [
                        { sort: true },
                        { title: sampleTitle }
                    ]
                }
            });
            console.log('Results count:', results.length);
            expect(results.length).toBe(1);
            expect(results[0].sort).toBe(true);
        });

        it('Test 11: OR combination with boolean', async () => {
            console.log('\n=== Test 11: OR combination ===');
            // First get any record with sort=false
            const allRecords = await ExampleSequelize.findAll({ where: { sort: false }, limit: 1 });
            if (allRecords.length === 0) {
                console.log('No records with sort=false, skipping');
                return;
            }
            
            const sampleTitle = allRecords[0].title;
            console.log('Sample title:', sampleTitle);
            
            const results = await ExampleSequelize.findAll({
                where: {
                    [Op.or]: [
                        { sort: true },
                        { title: sampleTitle }
                    ]
                }
            });
            console.log('Results count:', results.length);
            expect(results.length).toBeGreaterThan(0);
            expect(results.every(r => r.sort === true || r.title === sampleTitle)).toBe(true);
        });
    });

    describe('ModernQueryBuilder with real frontend data', () => {
        it('Should handle boolean eq with true value (as frontend sends)', async () => {
            console.log('\n=== Test: ModernQueryBuilder with value: true ===');
            const fields = {
                sort: { model: { type: 'boolean' }, config: { type: 'boolean' }, populated: undefined },
            };

            // Import what we need
            const { ModernQueryBuilder } = await import('../src/lib/query-builder/ModernQueryBuilder');
            const { DataAccessor } = await import('../src/lib/DataAccessor');
            const { SequelizeAdapter, SequelizeModel } = await import('../src/lib/model/adapter/sequelize');
            
            const adapter = new SequelizeAdapter(sequelize);
            const dataAccessor = new DataAccessor(adapter);
            
            // Get raw Sequelize model and wrap it in SequelizeModel
            const rawExampleModel = sequelize.models['Example'];
            const exampleModel = new SequelizeModel('example', rawExampleModel);
            
            const qb = new ModernQueryBuilder(exampleModel, fields, dataAccessor);
            
            const conditions = [{
                id: 'test-1',
                field: 'sort',
                operator: 'eq',
                value: true  // boolean, not string
            }];

            const queryParams = {
                page: 1,
                limit: 100,
                filters: conditions
            };

            console.log('Input condition:', JSON.stringify(conditions, null, 2));
            const whereClause = (qb as any).buildWhereClause(queryParams);
            console.log('WHERE clause:', whereClause);
            console.log('WHERE clause sort value type:', typeof whereClause.sort, whereClause.sort);
            
            const result = await qb.execute(queryParams);
            console.log('Results count:', result.filtered);
            console.log('All sort=true?', result.data.every((r: any) => r.sort === true));
            
            expect(result.data.every((r: any) => r.sort === true)).toBe(true);
        });

        it('Should handle boolean eq with false value (as frontend sends)', async () => {
            console.log('\n=== Test: ModernQueryBuilder with value: false ===');
            const fields = {
                sort: { model: { type: 'boolean' }, config: { type: 'boolean' }, populated: undefined },
            };

            const { ModernQueryBuilder } = await import('../src/lib/query-builder/ModernQueryBuilder');
            const { DataAccessor } = await import('../src/lib/DataAccessor');
            const { SequelizeAdapter, SequelizeModel } = await import('../src/lib/model/adapter/sequelize');
            
            const adapter = new SequelizeAdapter(sequelize);
            const dataAccessor = new DataAccessor(adapter);
            
            // Get raw Sequelize model and wrap it in SequelizeModel
            const rawExampleModel = sequelize.models['Example'];
            const exampleModel = new SequelizeModel('example', rawExampleModel);
            
            const qb = new ModernQueryBuilder(exampleModel, fields, dataAccessor);
            
            const conditions = [{
                id: 'test-2',
                field: 'sort',
                operator: 'eq',
                value: false  // boolean, not string
            }];

            const queryParams = {
                page: 1,
                limit: 100,
                filters: conditions
            };

            console.log('Input condition:', JSON.stringify(conditions, null, 2));
            const whereClause = (qb as any).buildWhereClause(queryParams);
            console.log('WHERE clause:', whereClause);
            console.log('WHERE clause sort value type:', typeof whereClause.sort, whereClause.sort);
            
            const result = await qb.execute(queryParams);
            console.log('Results count:', result.filtered);
            console.log('All sort=false?', result.data.every((r: any) => r.sort === false));
            
            expect(result.data.every((r: any) => r.sort === false)).toBe(true);
        });
    });
});
