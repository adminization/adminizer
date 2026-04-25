[Back](index.md)
# Inertia Express Adapter Documentation
## What is it Inertia.js ?
Inertia.js is a tool for creating modern single—page applications (SPA) without having to work with a full-fledged API (as in the traditional REST or GraphQL approach). It allows you to develop the frontend and backend as a single application using classic server routes and controllers, but with dynamic page updates without a complete reboot.
## How it works Inertia.js ?
Inertia.js acts as a bridge between the frontend (React, Vue, Svelte) and the backend (Laravel, Rails, Django, etc.). Here are the key principles of its operation:

1. The client side (Frontend)
* The application uses standard components (React/Vue/Svelte), but is not a full-fledged SPA in the classical sense.
* When clicking on links or submitting forms, Inertia intercepts these events and makes AJAX requests instead of completely reloading the page.
* The response from the server contains component data and its properties (props), not HTML.
2. Backend
* Instead of returning HTML or JSON API, the server returns an Inertia response (a special JSON object).
* This object contains:
  * The name of the component (for example, Users/Index).
  * The data (props) to be passed to the component.
  * The URL and other metadata.
* Example:
```typescript
return req.Inertia.render({
component: 'component',
props: props
})
```
3. Data exchange mechanism
* The first time you visit the page, the standard SSR (Server-Side Rendering) works.
* Subsequent transitions use fetch/XHR:
  * The user clicks on the <Link href="/users"> (provided by Inertia).
  * Inertia intercepts the click and sends an AJAX request to the server.
  * The server returns JSON with the data of the new component.
  * Inertia updates only the data and component on the page without reloading.

4. State (State Management)
* Inertia does not use complex state management systems (Redux, Pinia).
* All data is stored in the props components and updated with each transition.

5. Forms and POST requests
* Inertia provides the useForm hook for form processing:
```jsx
const { data, post } = useForm({ name: '' });

const submit = () => post('/users');
```
* When submitting the form, Inertia makes a POST request, the server processes it and returns the updated component data.
# Inertia Express Adapter
## Configuration Options
The adapter accepts the following configuration options:
```typescript
interface Options {
    readonly enableReload?: boolean;       // Enable component reloading
    readonly version: string;              // Asset version for cache busting
    readonly html: (page: Item, viewData: props) => string; // HTML template function
    readonly flashMessages?: (req: Request) => props; // Flash messages handler
    readonly csrf?: {                      // CSRF protection configuration
        enabled: boolean;
        cookieName?: string;               // Default: 'XSRF-TOKEN'
        headerName?: string;               // Default: 'x-xsrf-token'
    };
}
```
## Inertia Instance Methods
The adapter adds an `Inertia` object to the Express request with these methods:

`setViewData(viewData: props)` 
* Sets view data for the HTML template
* Returns the Inertia instance for chaining

`shareProps(sharedProps: props)`
* Merges provided props with existing shared props
* Returns the Inertia instance for chaining

`setStatusCode(statusCode: number)`
* Sets the HTTP status code for the response
* Returns the Inertia instance for chaining

`setHeaders(headers: Record<string, string>)`
* Merges provided headers with existing headers
* Returns the Inertia instance for chaining

`render(page: Item)`
* Renders the page as either:
  * JSON response for Inertia requests
  * HTML response for full page loads
* Automatically handles:
  * Flash messages (if configured)
  * Partial reloads
  * Async props
* Returns the Express Response object

`redirect(url: string)`
* Handles redirects with proper status codes:
  * 303 for PUT/PATCH/DELETE requests
  * 302 for other methods
* Returns the Express Response object
## Item Object Structure
```typescript
type props = Record<string | number | symbol, unknown>

interface Item {
    readonly component: string;  // Name of the frontend component
    props: props;                // Component props
    readonly url?: string;       // Current URL
    readonly version?: string;   // Asset version
}
```
## Headers
The adapter uses these Inertia-specific headers:
* `x-inertia`: Identifies Inertia requests
* `x-inertia-version`: Asset version for version checking
* `x-inertia-location`: Used for version mismatch redirects
* `x-inertia-partial-data`: Specifies partial reload data fields
* `x-inertia-partial-component`: Specifies component for partial reloads
* `x-inertia-current-component`: Tracks current component for reloads
## CSRF Protection
When enabled, the adapter:
1. Generates and sets a CSRF token cookie (`XSRF-TOKEN`)
    * Validates the token on non-GET requests by comparing:
2. Cookie value with header value (`x-xsrf-token` by default)
3. Returns 403 for invalid tokens
## Version Checking
The adapter automatically:
* Checks version headers on GET requests
* Returns 409 with location header when versions mismatch
* Destroys the session before redirecting
## Usage Example
```typescript
 // flash messages
adminizer.app.use(flash());

// inertia adapter
adminizer.app.use(
    inertia({
        version: '1',
        html: getHtml,
        flashMessages: (req: ReqType) => {
            return req.flash.flashAll();
        },
        csrf: {
            enabled: true,
            cookieName: 'XSRF-TOKEN',
            headerName: 'x-xsrf-token'
        },
    })
);

req.Inertia.setViewData({
    lang: req.session.UserAP?.locale || 'en',
})

const menuHelper = new InertiaMenuHelper(adminizer)

req.Inertia.shareProps({
    auth: {
        user: req.session.UserAP
    },
    menu: req.session.UserAP ? menuHelper.getMenuItems(req) : null,
    brand: menuHelper.getBrandTitle(),
    logout: menuHelper.getLogoutUrl(),
    //...
})
```

`menuHelper.getMenuItems(req)` returns sidebar items already localized on the server (titles, sections, and nested action titles are translated via `req.i18n.__(...)` before sending Inertia props).
You can also share a common dictionary (for example `uiMessages`) via `shareProps` and consume it in React components for reusable interface labels.
For dashboard widgets, shared `uiMessages` can include keys like `Show`, `Hide`, `On`, `Off`, and `No widgets found`.

**See the implementation here** `src/system/bindInertia.ts`
### Usage in controllers
Example:
```typescript
//add.ts
const props = inertiaAddHelper(req, entity, fields)
return req.Inertia.render({
    component: 'add',
    props: props
})
```
# Flash Middleware Documentation
## Overview
The Flash Middleware provides session-based flash message management for Express.js applications. Flash messages are temporary messages that persist across requests, typically used for displaying notifications, errors, or other one-time information to users.
### Example:
```typescript
req.flash.setFlashMessage('success', 'Works!');
req.flash.setFlashMessage('error', 'Oops!');
```
### Best Practices
1. Always type your flash messages for better code safety
2. Retrieve flash messages with flash() or flashAll() exactly once per request
3. Keep flash messages short and user-friendly
4. Use consistent message types throughout your application

**For more information, see** `src/lib/inertia/flash.ts`

### `Note:`
Client use React 19. For more information about how inertia works on the client, see http://inertiajs.com
