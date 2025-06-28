### 🔧 Issue with Model Name Casing in Config (Waterline, Sequelize, TypeORM)

**Description:**

In different external resource modules (ORMs), model names can vary in casing — some use lowercase (`userresource`), while others use PascalCase (`UserResource`). This inconsistency causes configuration resolution issues and can result in the following error:

```
type error: model config of resourceprototype is undefined expected object
```

**Cause:**

Currently, models are referenced in the config using their name as-is — without normalization. For now, the `Models` object should have **lowercase** keys:

```ts
models: {
  userresource: { ...config },
  groupcatalog: { ...config }
}
```

The configuration system looks up the model config by exact key match. If the key casing doesn't match what the ERM uses internally, the config is not found, and an error is thrown.

**Temporary Rule:**

* Use **lowercase model names** as keys in the `models` config section.
* Match the model name exactly as it is referenced internally by your ERM (Waterline, Sequelize, TypeORM).

**Planned Improvements:**

In the future, we will introduce the concept of a *model entity*, which will allow for more flexible and case-independent model resolution.
### Build Fails Due to Missing `material-icons` CSS

**Description:**

Running `npm run build` may fail with an error like:

```
Can't resolve 'material-icons/iconfont/material-icons.css'
```

**Solution:**

Install the `material-icons` package so the CSS can be resolved:

```
npm install material-icons --legacy-peer-deps
```


### Sequelize Self-Relation Naming Collision

**Description:**

When a model references itself using both `model` and `collection` fields, Sequelize may throw an error:

```
Error: Naming collision between attribute 'parentNode' and association 'parentNode'
```

**Solution:**

Upgrade to version 4.2.2 or later, which automatically assigns unique aliases for self-referential associations.
