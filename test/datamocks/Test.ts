import Waterline from "waterline";

const Test = Waterline.Collection.extend({
  identity: "Test",
  datastore: "default",
  primaryKey: "id",

  attributes: {
    // ID
    id: {
      type: "number",
      //@ts-ignore
      autoMigrations: { autoIncrement: true },
    },

    // Primitive fields
    title: {
      type: "string",
      required: true,
    },

    number: {
      type: "number",
      allowNull: true,
    },

    color: {
      type: "string",
      allowNull: true,
    },

    guardedField: {
      type: "string",
      allowNull: true,
    },

    // Self-referential association
    selfAssociation: {
      model: "test",
    },

    // One-way communication on Example
    example: {
      model: "example",
    },

    // Association to UserAP (owner)
    userField: {
      model: "userap",
    },

    // Many users (many-to-many)
    // @ts-ignore
    userAPs: {
      collection: "userap"
    }
  },
});

export default Test;
