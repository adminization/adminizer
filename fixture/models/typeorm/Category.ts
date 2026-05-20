import { EntitySchema } from "typeorm";

export interface Category {
    id: string;
    title?: string;
    slug?: string;
    mediamanager_one?: object;
    mediamanager_two?: object;
    single_file?: object;
    createdAt?: Date;
    updatedAt?: Date;
}

export const CategoryTypeOrm = new EntitySchema<Category>({
    name: "Category",
    tableName: "category",
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
        slug: {
            type: "varchar",
            nullable: true,
        },
        mediamanager_one: {
            type: "simple-json",
            nullable: true,
        },
        mediamanager_two: {
            type: "simple-json",
            nullable: true,
        },
        single_file: {
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
