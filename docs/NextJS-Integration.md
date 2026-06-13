# Next.js Integration Guide

This guide helps you integrate Adminizer with Next.js applications, especially when using standalone build mode. Sequelize is the recommended adapter. TypeORM support is experimental.

## Quick Start

### 1. Install Adminizer

```bash
npm install adminizer
# or
pnpm add adminizer
# or
yarn add adminizer
```

### 2. Configure Next.js for Standalone Build

**Important:** If you're using Next.js with `output: "standalone"`, you must configure Next.js to include Adminizer files in the build.

Create or update your `next.config.mjs`:

```javascript
/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  experimental: {
    outputFileTracingIncludes: {
      "/api/**/*": [
        "./node_modules/adminizer/**/*"
      ]
    },
  },
};

export default nextConfig;
```

**What this does:**
- `outputFileTracingIncludes` tells Next.js to include all Adminizer files (assets, controllers, translations, icons) in the standalone build
- `/api/**/*` applies this rule to all API routes (adjust if your Adminizer route is different)

### 3. Create API Route

Create a catch-all API route for Adminizer:

#### Pages Router

Create `pages/api/adminizer/[[...adminizer]].ts`:

```typescript
import { Adminizer, SequelizeAdapter } from 'adminizer';
import type { NextApiRequest, NextApiResponse } from 'next';
import { Sequelize } from 'sequelize';
import { registerSequelizeSystemModels } from '../../../server/adminizer-system-models';

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'database.sqlite',
  logging: false,
});

let adminizer: Adminizer | null = null;
let initialization: Promise<Adminizer> | null = null;

async function getAdminizer() {
  if (adminizer) {
    return adminizer;
  }
  if (!initialization) {
    initialization = (async () => {
      registerSequelizeSystemModels(sequelize);
      // Prefer project migrations in production.
      await sequelize.sync();

      const instance = new Adminizer([
        new SequelizeAdapter(sequelize),
      ]);
      await instance.init({
        routePrefix: '/api/adminizer',
        system: { defaultORM: 'sequelize' },
        models: {
          // Your model configuration.
        },
      });
      adminizer = instance;
      return instance;
    })();
  }
  return initialization;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const admin = await getAdminizer();
    const middleware = admin.getMiddleware();

    return new Promise((resolve) => {
      middleware(req as any, res as any, (err: any) => {
        if (err) {
          console.error('Adminizer middleware error', err);
          res.status(500).json({ error: err.message });
          return resolve(undefined);
        }
        resolve(undefined);
      });
    });
  } catch (error) {
    console.error('Adminizer initialization error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

#### App Router

Next.js App Router handlers use the Web `Request`/`Response` API, while `adminizer.getMiddleware()` is Express-compatible middleware. Use a Node/Express custom server or an adapter that bridges those APIs; do not pass an App Router request directly to Adminizer middleware.

### TypeORM

TypeORM system entities can be used, but all system and app entities must be included in `DataSource.entities` before `dataSource.initialize()`. Dynamic app model installation after initialization is not supported. See [System Models](Configuration/Models.md#typeorm) and [App Models](BuildingModules.md#typeorm).

## Docker Configuration

### Dockerfile for Next.js Standalone

```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js app
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Note: With outputFileTracingIncludes configured, 
# Adminizer files are automatically included in .next/standalone/node_modules/adminizer

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### Docker Compose Example

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@db:5432/myapp
      - AP_PASSWORD_SALT=your-secret-salt-here
    depends_on:
      - db
    volumes:
      - ./database.sqlite:/app/database.sqlite # For SQLite
  
  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Environment Variables

Create a `.env.local` file in your Next.js project:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/myapp

# Adminizer
AP_PASSWORD_SALT=your-very-secret-salt-here

# Next.js
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Troubleshooting

### Assets Not Loading (404 errors)

**Problem:** CSS/JS files return 404 errors like `/api/adminizer/assets/app-*.css`

**Solution:** Ensure you've added `outputFileTracingIncludes` to your `next.config.mjs` as shown above.

### Controllers Not Found

**Problem:** `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/app/node_modules/adminizer/controllers/addUser.js'`

**Solution:** 
1. Upgrade to Adminizer v4.4.0+ (which includes automatic path fallback)
2. Ensure `outputFileTracingIncludes` is properly configured in `next.config.mjs`

### Database Connection Issues

Make sure your database is properly initialized before calling `adminizer.init()`:

```typescript
registerSequelizeSystemModels(sequelize);
await sequelize.authenticate();
await sequelize.sync(); // Prefer migrations in production.

const adminizer = new Adminizer([
  new SequelizeAdapter(sequelize),
]);
await adminizer.init(config);
```

### Session Issues

Authentication requires stable secrets in the server environment. Do not generate them per request or per serverless invocation:

```dotenv
JWT_SECRET=replace-with-a-stable-secret
AP_PASSWORD_SALT=replace-with-a-stable-salt
```

## Additional Resources

- [Adminizer Documentation](https://adminizer.github.io)
- [Troubleshooting Guide](./Troubleshooting.md)
- [Next.js Standalone Output](https://nextjs.org/docs/app/api-reference/next-config-js/output)
- [Next.js API Routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes)
