# Authorization

Adminizer includes a simple session‑based authentication mechanism. When the `auth` option is enabled, users must log in before accessing the panel.

## Enabling Authentication

```javascript
await adminizer.init({
    auth: true,
    administrator: {
        login: 'admin',
        password: 'change-me'
    }
});
```

When the panel starts and no user records exist, an administrator profile with these credentials is automatically created. Log in using the built‑in login form at `/admin/login`.

## Customizing the Process

You can plug your own authentication logic by disabling built‑in auth and protecting the route with middleware or a JWT strategy:

```javascript
await adminizer.init({ auth: false });

app.use('/admin', verifyJwtToken, adminizer.app);
```

In this case you are responsible for setting `req.session.UserAP` or providing a custom user object via `adminizer.setCurrentUser()`.

## Integrating with External Systems

Nothing prevents you from storing users in your existing database. Simply map your user model to Adminizer's `UserAP` interface or supply a custom adapter that knows how to validate credentials.

For advanced setups consider using a JWT token issued by your main application. On every request the token is verified and the corresponding user profile is loaded into the session.

