import { EntitySchema } from "typeorm";

export interface TestCatalog {
    id: string;
    tree?: object;
}

export const TestCatalogTypeOrm = new EntitySchema<TestCatalog>({
    name: "TestCatalog",
    tableName: "testcatalog",
    columns: {
        id: {
            type: "varchar",
            primary: true,
            generated: "uuid",
        },
        tree: {
            type: "simple-json",
            nullable: true,
        },
    },
});
