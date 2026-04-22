import Waterline from "waterline";

const Example = Waterline.Collection.extend({
	identity: "example",
	datastore: "default",
	primaryKey: "id",
	attributes: {
		// @ts-ignore
		id: { type: "number", autoMigrations: { autoIncrement: true } },
		title: { type: "string" },
        description: { type: "string"},
        disabled_text: { type: "string"},
        sort: { type: "boolean" },
        time: { type: "ref" },
        number: { type: "number" },
        color: { type: "string" },
        range: { type: "string" },
        date: { type: "ref" },
        month: { type: "number" },
        week: { type: "number" },
        code: { type: "string" },
        editor: { type: "string" },
        selectMany: { type: "json" },
        select: { type: "string" },
        testRelation: { model: "Example" },
        tui: { type: "string" },
        datatable: { type: "json" },
        json: { type: "json" },
        tests: { collection: "Test", via: "example" },
        datetime: { type: "ref" },
        geojson: { type: "json" },
        
        // Many-to-many relation with UserAP
		// @ts-ignore
        owner: { 
			model: 'UserAP'
		},
    }
});

export default Example;
