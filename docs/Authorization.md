# Authorization

Adminizer authorization is controlled by the `auth` block in `AdminpanelConfig`.

```ts
const config = {
  routePrefix: "/adminizer",
  auth: {
    enable: true,
    captcha: true,
  },
  administrator: {
    login: "admin",
    password: "change-me",
  },
  models: {},
};
```

When `auth.enable` is `true`, Adminizer registers login, logout, and registration routes under the configured `routePrefix`.

## Administrator bootstrap

If there is no administrator account, Adminizer can route users to the initial user setup screen. The fixture provides administrator credentials through `ADMIN_LOGIN` and `ADMIN_PASS`, falling back to local defaults in `fixture/adminizerConfig.ts`.

## Access gate

Successful login is not the only check. Users also need the `access-to-adminpanel` token unless they are administrators. Model actions are guarded by generated tokens in the form:

* `create-<model>-model`
* `read-<model>-model`
* `update-<model>-model`
* `delete-<model>-model`

Custom feature permissions can be registered through `adminizer.accessRightsHelper.registerToken(...)`.
