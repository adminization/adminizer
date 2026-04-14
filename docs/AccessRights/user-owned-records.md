### **User-Owned Records**

In multi-user admin panels, it’s often essential to restrict data access based on ownership — that is, which user a record belongs to. `DataAccessor` supports this logic through model configuration by linking records to the `UserAP` model. This enables:

* Automatically setting the `userId` field (or equivalent) on record creation
* Restricting access so that users can only read or modify their own records
* Enforcing ownership-based permission checks seamlessly
* Supporting clean separation of data in multi-tenant or user-based systems

#### **How It Works**

In the model config, you specify a field that connects the record to a user:

```ts
models: {
  Report: {
    userAccessRelation: "author", // field that links to UserAP
    fields: {
      content: { type: "text" },
      author: { model: "userap" }
    }
  }
}
```

If the user is **not an administrator**, they will only be able to access records where they are listed in the `author` field. This ownership check is enforced automatically through `sanitizeUserRelationAccess`.

#### **Create vs Update Behavior**

When `userAccessRelation` points to a `UserAP` association (for example, `author`):

* On **create**, ownership is assigned automatically via `setUserRelationAccess`:
  * If a non-admin sends any `author` value manually, it is ignored.
  * The saved value is forced to the current user ID.
* On **update**, ownership is **not auto-assigned** again:
  * Access is still restricted to the user’s own records through `sanitizeUserRelationAccess`.
  * In other words, update is protected by ownership filtering, not by re-writing the owner field.

#### **Important Notes**

* The `userAccessRelation` field must exist in the ORM model and be an association to `UserAP`.
* The user model (e.g., `UserAP`) must be properly registered and include the required access rights tokens.
* Without defining `userAccessRelation`, access is controlled only via global permissions (using `AccessRightsHelper`), not per-record ownership.

#### **FK + Alias Support**

`userAccessRelation` may reference either:

* a direct association field (for example, `owner`), or
* a foreign key field (for example, `ownerId`) when there is an association alias with `via: "ownerId"` that points to `UserAP`.

This is useful for ORM schemas where relation metadata is stored on an alias field while the configured access field is a plain FK column.

This approach ensures secure and isolated access to data across users — critical for SaaS platforms, B2B applications, and any system with private user-specific content.
