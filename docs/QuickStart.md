# Quick Start

This guide shows the fastest way to get Adminizer running with a single Sequelize model. It assumes you already have Node.js installed.

1. **Install the package**

```bash
npm install adminizer sequelize sqlite3
```

2. **Create a minimal server**

```javascript
// index.js
import { Adminizer } from 'adminizer';
import { SequelizeAdapter } from 'adminizer/v4/model/adapter/sequelize';
import { Sequelize, DataTypes } from 'sequelize';
import http from 'http';

async function start() {
    const sequelize = new Sequelize('sqlite::memory:', { logging: false });
    const Post = sequelize.define('Post', {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        title: DataTypes.STRING,
        content: DataTypes.TEXT
    });
    await sequelize.sync({ force: true });

    const adapter = new SequelizeAdapter({ sequelize, models: { Post } });
    const adminizer = new Adminizer([adapter]);
    await adminizer.init({ routePrefix: '/admin', auth: false });

    const server = http.createServer((req, res) => {
        if (req.url.startsWith('/admin')) {
            adminizer.app(req, res, () => {});
        } else {
            res.end('Hello');
        }
    });
    server.listen(3000);
    console.log('Open http://localhost:3000/admin');
}

start();
```

3. **Run the script**

```bash
node index.js
```

Open your browser at `http://localhost:3000/admin` and you will see the admin panel with the `Post` model ready for use.
