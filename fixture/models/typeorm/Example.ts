import { EntitySchema } from "typeorm";
import type { Test } from "./Test";

export interface Example {
    id: string;
    title?: string;
    description?: string;
    disabled_text?: string;
    sort?: boolean;
    time?: string;
    number?: number;
    color?: string;
    range?: number;
    date?: Date;
    month?: string;
    week?: string;
    code?: string;
    editor?: string;
    selectMany?: object;
    select?: string;
    testRelation?: Example;
    testRelationExample?: Example;
    tui?: string;
    datatable?: object;
    json?: object;
    tests?: Test[];
    datetime?: Date;
    geojson?: object;
    owner?: object;
    createdAt?: Date;
    updatedAt?: Date;
}

export const ExampleTypeOrm = new EntitySchema<Example>({
    name: "Example",
    tableName: "example",
    columns: {
        id: {
            type: "varchar",
            primary: true,
            generated: "uuid",
        },
        title: {
            type: "varchar",
            nullable: true,
        },
        description: {
            type: "varchar",
            nullable: true,
        },
        disabled_text: {
            type: "varchar",
            nullable: true,
        },
        sort: {
            type: "boolean",
            nullable: true,
        },
        time: {
            type: "varchar",
            nullable: true,
        },
        number: {
            type: "integer",
            nullable: true,
        },
        color: {
            type: "varchar",
            nullable: true,
        },
        range: {
            type: "integer",
            nullable: true,
        },
        date: {
            type: "datetime",
            nullable: true,
        },
        month: {
            type: "varchar",
            nullable: true,
        },
        week: {
            type: "varchar",
            nullable: true,
        },
        code: {
            type: "varchar",
            nullable: true,
        },
        editor: {
            type: "varchar",
            nullable: true,
        },
        selectMany: {
            type: "simple-json",
            nullable: true,
        },
        select: {
            type: "varchar",
            nullable: true,
        },
        tui: {
            type: "varchar",
            nullable: true,
        },
        datatable: {
            type: "simple-json",
            nullable: true,
        },
        json: {
            type: "simple-json",
            nullable: true,
        },
        datetime: {
            type: "datetime",
            nullable: true,
        },
        geojson: {
            type: "simple-json",
            nullable: true,
        },
        createdAt: {
            type: "datetime",
            createDate: true,
        },
        updatedAt: {
            type: "datetime",
            updateDate: true,
        },
    },
    relations: {
        testRelationExample: {
            type: "many-to-one",
            target: "Example",
            joinColumn: {
                name: "testRelationId",
            },
            nullable: true,
        },
        tests: {
            type: "one-to-many",
            target: "Test",
            inverseSide: "example",
        },
        owner: {
            type: "many-to-one",
            target: "UserAP",
            joinColumn: {
                name: "ownerId",
            },
            nullable: true,
        },
    },
});
