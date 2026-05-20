# How to Start Adminizer

To launch **Adminizer**, you need to follow a few simple steps:

---

## 1. Create an Adminizer instance

You must create an instance of the `Adminizer` class.  
When creating it, you should pass an array of adapters — adapters are responsible for connecting Adminizer to your data sources. Sequelize is the primary supported adapter. TypeORM support exists, but is experimental.

---

## 2. Configure the adapters

Each adapter acts as a bridge between Adminizer and your models.  
You need to prepare and configure at least one adapter:
- For **Sequelize**, create a database connection and register your models.
- For **TypeORM**, use the experimental `TypeOrmAdapter` only after testing it against your project models.
- Or _use any other ORM_ by implementing a custom adapter that extends AbstractAdapter.
Adminizer is designed to be flexible and can be integrated with any ORM or data source.
---

## 3. Initialize Adminizer

After creating the Adminizer instance, call the `init` method and pass the project configuration, which includes:
- the route prefix (e.g., `/adminizer`),
- the project name,
- whether authentication is required,
- and optionally database connection settings.

---

## 4. Create an HTTP server

To access Adminizer through the browser, you must create an HTTP server (e.g., using Node.js `http` module).  
You should forward all requests starting with the route prefix (like `/adminizer`) to Adminizer’s application handler.  
Other requests can be processed separately (e.g., by returning a basic welcome page).

---

## 5. Start the server

Once everything is set up, start the server and listen on a port (typically 3000).  
After that, the Adminizer panel will be available at a URL like `http://localhost:3000/adminizer`.

---

# What Happens After Startup

- When a user navigates to `/adminizer`, the request is routed to Adminizer.
- Adminizer renders the administrative panel UI.
- If models were registered via adapters, Adminizer automatically displays them for:
  - viewing records,
  - creating new entries,
  - editing and deleting records.
- If authentication is enabled, users must log in before accessing the panel.

---

# Minimum Requirements to Run Adminizer

- An Adminizer instance (`new Adminizer([...])`).
- At least one adapter (can be empty or connected to a database).
- A call to the `init` method with basic configuration.
- A server that routes requests to Adminizer.

---

# Troubleshooting Adminizer Startup

If you encounter difficulties launching **Adminizer**,  
you can use the ready-made **fixture** (template project) available in the repository folder [`fixture`](https://github.com/adminization/adminizer/tree/main/fixture).

This project already includes:
- a fully configured Adminizer setup,
- working Sequelize models,
- experimental TypeORM models,
- example seed data,
- and a minimal configuration required to start.

It serves as a practical starting point to help you quickly understand how Adminizer, models, adapters, and configuration fit together.

### How to use the armature:

```bash
git clone https://github.com/adminization/adminizer.git
cd adminizer
npm install --force
npm run demo:build && npm run demo
```

After running these commands, you will have a fully working Adminizer instance ready for testing and development at `http://localhost:3000/adminizer`.

---

Example:

```typescript
import { Adminizer, SequelizeAdapter } from "adminizer";
import { Sequelize, DataTypes } from "sequelize";
import express from "express";

async function start() {
    // 1. Initialize Sequelize
    const sequelize = new Sequelize('sqlite::memory:', { logging: false });
    await SequelizeAdapter.registerSystemModels(sequelize);

    // 2. Define a model
    const Example = sequelize.define('example', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
        },
    }, {
        tableName: 'examples',
        timestamps: false,
    });

    // 3. Synchronize the database (this will create the table)
    await sequelize.sync({ force: true });

    // 4. Create an adapter
    const sequelizeAdapter = new SequelizeAdapter(sequelize);

    // 5. Create Adminizer instance
    const adminizer = new Adminizer([sequelizeAdapter]);

    await adminizer.init({
        routePrefix: "/adminizer",
        auth: { enable: false },
        models: {
            Example: {
                title: "Examples",
                model: "example",
                fields: {
                    id: { title: "ID", type: "integer" },
                    title: { title: "Title", type: "string" },
                    description: { title: "Description", type: "text" },
                },
                list: true,
                add: true,
                edit: true,
                view: true,
                remove: true,
            },
        },
    });

    // 6. HTTP server
    const mainApp = express();
    mainApp.use(adminizer.getMiddleware());
    mainApp.get("/", (_req, res) => {
        res.type("html").send('<h1>Welcome</h1><p>Go to <a href="/adminizer">Adminizer</a></p>');
    });

    mainApp.listen(3000, () => {
        console.log('Server started: http://localhost:3000/adminizer');
    });
}

start();

```

