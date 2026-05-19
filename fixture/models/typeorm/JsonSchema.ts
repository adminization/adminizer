import { EntitySchema } from "typeorm";

export interface JsonSchemaRecord {
    id: string;
    name: string;
    data?: object;
    createdAt?: Date;
    updatedAt?: Date;
}

export const JsonSchemaTypeOrm = new EntitySchema<JsonSchemaRecord>({
    name: "JsonSchema",
    tableName: "jsonschema",
    columns: {
        id: {
            type: "varchar",
            primary: true,
            generated: "uuid",
        },
        name: {
            type: "varchar",
            nullable: false,
        },
        data: {
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
});
