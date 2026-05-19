import { EntitySchema } from "typeorm";
import type { Example } from "./Example";
import type { JsonSchemaRecord } from "./JsonSchema";

export interface Test {
    id: string;
    title: string;
    mediamanager?: object;
    example?: Example;
    schema?: JsonSchemaRecord;
    owner?: object;
    userAPs?: object[];
    createdAt?: Date;
    updatedAt?: Date;
}

export const TestTypeOrm = new EntitySchema<Test>({
    name: "Test",
    tableName: "test",
    columns: {
        id: {
            type: "varchar",
            primary: true,
            generated: "uuid",
        },
        title: {
            type: "varchar",
            nullable: false,
        },
        mediamanager: {
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
        example: {
            type: "many-to-one",
            target: "Example",
            inverseSide: "tests",
            joinColumn: {
                name: "exampleId",
            },
            nullable: true,
        },
        schema: {
            type: "many-to-one",
            target: "JsonSchema",
            joinColumn: {
                name: "schemaId",
            },
            nullable: true,
        },
        owner: {
            type: "many-to-one",
            target: "UserAP",
            joinColumn: {
                name: "ownerId",
            },
            nullable: true,
        },
        userAPs: {
            type: "many-to-many",
            target: "UserAP",
            joinTable: {
                name: "test_useraps",
                joinColumn: {
                    name: "testId",
                },
                inverseJoinColumn: {
                    name: "userAPId",
                },
            },
        },
    },
});
