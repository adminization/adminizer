export const navigationModelName = "Navigation";

export const navigationSchema = {
    id: {
        type: "number",
        autoIncrement: true,
        primaryKey: true,
    },
    label: {
        type: "string",
        required: true,
        unique: true,
    },
    tree: {
        type: "json",
        required: true,
    },
};

export interface NavigationModel {
    id?: number;
    label: string;
    tree: Record<string, unknown>;
}
