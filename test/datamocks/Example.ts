import Waterline from "waterline";

const Example = Waterline.Collection.extend({
  identity: "example",
  datastore: "default",
  primaryKey: "id",

  attributes: {
    id: {
      type: "number",
      //@ts-ignore
      autoMigrations: { autoIncrement: true }
    },

    title: {
      type: "string",
      required: true
    },

    description: {
      type: "string"
    },

    // Feedback (1:* with Test)
    tests: {
      collection: "Test",
      via: "example"
    }
  }
});

export default Example;
