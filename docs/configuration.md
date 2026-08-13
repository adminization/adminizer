# Admin Panel configuration

> This page is a legacy extended reference. Prefer the focused pages in `docs/Configuration/` for new projects. Sequelize is the primary supported ORM; TypeORM support is experimental.


### Abstract

The core principle of configuring Adminizer is based on building a global JSON object, structured according to a specific [TypeScript interface](..\src\interfaces\adminpanelConfig.ts). This object defines and manages the entire behavior and layout of the admin panel.

The configuration is designed to be simple and declarative: by describing the system through a JavaScript object, you can fully customize the admin panel without modifying the underlying code. Additionally, Adminizer supports extensions — developers can create catalogs, managers, and modules by implementing instances of abstract classes. These extensions are automatically integrated into the interface or runtime of Adminizer when registered in the appropriate handlers.

In this section, we focus specifically on the fundamental concept — the configuration JSON object.


Typescript example:


```typescript

import { AdminizerConfig } from "adminizer";

const config: AdminizerConfig = {
  routePrefix: "/admin",
  auth: { enable: true },
  dashboard: true,
  models: {
    ExampleModel: {
      title: "Example Models",
      model: "ExampleModel",
      fields: {
        id: { title: "ID", type: "integer" },
        name: { title: "Name", type: "string" },
        description: { title: "Description", type: "text" },
        createdAt: { title: "Created At", type: "datetime" },
        updatedAt: { title: "Updated At", type: "datetime" },
      },
      list: {
        fields: {
          id: {},
          name: {},
          createdAt: {},
        }
      },
      add: true,
      edit: true,
      remove: true,
      view: true,
    }
  },
  welcome: {
    title: "Welcome to Adminizer",
    text: "Manage your application easily with Adminizer Admin Panel."
  },
  translation: {
    locales: ["en"],
    defaultLocale: "en",
  },
  administrator: {
    login: "admin",
    password: "admin123",
  },
  showVersion: true,
};
```


## Global configs

Admin panel configuration consist of this options:

| Option            | Description
|-------------------|--------------------------
| `routePrefix`     | Route prefix for admin panel. Default: `/admin`
| `linkAssets`      | Will create a symlink to Admin panel assets. Anyway AP will try to load all assets from /admin/**** and you could copy them manually
| `identifierField` | Default identifier field into models. This field will be used as identifier. Default: `id`
| `models`       | Configuration for models. Read below...
| `showORMtime`     | Set `true` for enable showing fields createdAt and updatedAt in edit and add sections

### List defaults

Use the global `list.defaultPageSize` option to set how many records are shown on model list pages by default. Supported values are `5`, `20`, and `50`; the default value is `50`.

```typescript
const config: AdminizerConfig = {
  list: {
    defaultPageSize: 20,
  },
  models: {
    // ...
  },
};
```

## Models

Admin panel divided into `models` and this is a main part of configuration.

Model will represent several actions for each model that you need to enable into Admin Panel.
It will consist of actions:

+ `list` - list of records with filters, pagination and sorting.
+ `add` - add a new records
+ `edit` - editing of record
+ `view` - view details of record
+ `remove` - ability to remove record

Every model configuration should be placed into `models` block into `config/adminpanel.js` file.
And have a required property `model`.

```
module.exports.adminpanel = {
    models: {

        users: { // canonical Adminizer resource name; it controls URL and permissions
            title: 'Users', // If not defined will be taken from key. Here will be `users`
            model: 'User', // !!! required !!!
        }
    }
};
```

## Actions configuration

Every action into model could be configured separately.
Actions configuration shuold be placed into `model` block.

```
module.exports.adminpanel = {
    models: {

        users: { // key. No matter what you will write here. just follow JS rules for objects
            title: 'Users', // If not defined will be taken from key. Here will be `users`
            model: 'User', // !!! required !!!

            //  ==== Actions configuration here ====
        }
    }
};
```

Every action could be configured in several ways, **but it should have action key** (list/add/edit/view/remove):

+ `boolean` - Enable/disable functionality.
```
models: {
    users: {
        // ...

        list: true, // will mean that list action should exist. Enabled by default.
        edit: false // Will disable edit functionality for model.
    }
}
```

+ `object` - detailed configuration of action.

```
models: {
    users: {
        list: {
            limit: 15, // will set a limit of actions. This option supports only list action !
            fields: {} // list of fields configuration
        }
    }
}
```


## Fields configuration

Each field is configured with an **object** (`ModelFieldConfig`):

```
fieldName: {
    title: "Field title", // overwrite field title
    type: "string", // overwrite default field type in admin panel
    required: true, // mark field required or not
    tooltip: 'tooltip for field', // tooltip for field
    editor: true, // add WYSIWYG editor for the field in admin panel
    visible: false, // hide field (e.g. on a specific action)
}
```

To hide a field, set `visible: false`. To override only the title, pass `{ title: "Field title" }`.

> **Breaking change in v5:** the boolean (`field: true`/`false`) and string (`field: "Title"`) shorthand notations were removed. Use the object form. A primitive value will be ignored at runtime with a warning.

**There are several places for field config definition and an inheritance of field configs.**

+ You could use a global `fields` property into `config/adminpanel.js` file into `models` section.
+ You could use `fields` property into `models:action` configuration. Action level config is shallow-merged on top of the global one.

```
module.exports.adminpanel = {
    models: {
        users: {
            title: 'Users', // Menu title for model
            model: 'User', // Model definition for model

            fields: {
                email: { title: 'User Email' }, // define title for this field in all actions (list/add/edit/view)
                createdAt: { visible: false }, // hide createdAt field in all actions
                avatar: {
                    displayModifier: function (img) { // Only for list view, look callback.md for more info
                        return `<img src="${img}">`
                    }
                },
                bio: {
                    title: 'User bio',
                    type: 'text', // LOOK BELOW FOR TYPES DESCRIPTION
                    editor: true
                } // sets title `User bio` and adds editor in add/edit actions. Could be combined only with `text` type
            },
            // Action level config
            list: {
                fields: {
                    bio: { visible: false } // hide bio field in list view
                }
            },

            edit: {
                fields: {
                    createdAt: { title: 'Created at' } // override title for createdAt in edit
                }
            }
        }
    }
}
```

## Hide model

You can hide model from left navbar using `hide` option.

```javascript
module.exports.adminpanel = {
    models: {
        users: {
            title: 'Users', // Menu title for model
            model: 'User', // Model definition for model
            hide: true
        }
    }
}
```

## Ignored fields
You can hide fields from all actions by setting `visible: false`.

```javascript
module.exports.adminpanel = {
    models: {
        users: {
            title: 'Users', // Menu title for model
            model: 'User', // Model definition for model

            // these fields will be hidden in all actions
            fields: {
                'admin': { visible: false },
                'someAnotherField': { visible: false },
                'encryptedPassword': { visible: false }
            }
        }
    }
}
```

## Field types

Field types could be set into `field` configuration or will be inherited from your model definition.

Now Admin panel supports several field types and add proper editor for every type.

Types included into admin panel:
+ `string` - textfield into add/edit actions
+ `string` with `isIn` - selectbox
+ `password` - password field
+ `date` - input type date
+ `datetime` - input type datetime
+ `integer` / `float` - input type number
+ `boolean` - checkbox
+ `text` - textarea
+ `select` - html select

**If you will conbine `text` type with `editor` option for the field admin panel will create a WYSTYG editor for this field.**

## Select box

Sails.js Hook adminpanel supports selectboxes.

If you have `isIn` field in your model it will be displayed into adminpanel as a select box.
You can overwrite `isIn` title using fields configurations:

Example:

Your model:
```javascript
module.exports = {
    attributes: {
        gender: {
            type: 'string',
            isIn: ['male', 'female'],
            required: true
        }
    }
};
```

Your admin panel configuration:
```javascript
module.exports.adminpanel = {
    models: {
        users: {
            title: 'Users', // Menu title for model
            model: 'User', // Model definition for model

            fields: {
                'gender': {
                    isIn: {
                        male: 'Male',
                        female: 'Female'
                    }
                }
            }
        }
    }
}
```

## Select many
You need configure you field as json

Your model:
```javascript
module.exports = {
    attributes: {
        contactType: {
            type: 'json',
        }
    }
};
```

Your admin panel configuration:
You need configure isIn option for you filed as plain object {} or array of strings

```javascript
module.exports.adminpanel = {
    models: {
        users: {
            title: 'Users', // Menu title for model
            model: 'User', // Model definition for model

            fields: {
                'contactType': {
                    isIn: {
                        'email': 'E-Mail',
                        'phone': 'Phone',
                        'sms': 'SMS'
                    }
                }
            }
        }
    }
}
```

## Associations

Adminizer partially supports associations.

Adminizer detects association fields from adapter metadata. For example, a relation field may be represented as:

```javascript
fieldName: {
    model: 'SomeModel'
}
```

Admin panel will create select list for `add/edit` actions and will populate record for `list/view` actions.

Available configuration options:
+ `title` - Default title option

Deprecated options: `identifierField`, `displayField` was mowed in model config

Example:
```javascript
owner: {
    title: 'Owner'
}
```

## Auto config

The old Sails auto-config example is not applicable to current Adminizer projects. Define models explicitly in `AdminpanelConfig.models`, or generate that object from your ORM metadata in project code.

```ts
const config = {
  models: {
    Example: {
      title: "Example",
      model: "example",
    },
  },
};
```


## Limitations

+ Association support depends on the active adapter and model metadata.
+ Custom controls, modules, widgets, media manager uploads, and custom assets are supported by current Adminizer versions. See the focused documentation pages for current APIs.

## Configuration schema


```javascript
// @ts-check
// import { AdminizerConfig } from "adminizer"; // Import the type via JSDoc comment

/** @type {import("adminizer").AdminizerConfig} */
const config = {
  routePrefix: "/admin",
  auth: { enable: true },
  dashboard: true,
  models: {
    ExampleModel: {
      title: "Example Models",
      model: "ExampleModel",
      fields: {
        id: { title: "ID", type: "integer" },
        name: { title: "Name", type: "string" },
        description: { title: "Description", type: "text" },
        createdAt: { title: "Created At", type: "datetime" },
        updatedAt: { title: "Updated At", type: "datetime" },
      },
      list: {
        fields: {
          id: {},
          name: {},
          createdAt: {},
        }
      },
      add: true,
      edit: true,
      remove: true,
      view: true,
    }
  },
  welcome: {
    title: "Welcome to Adminizer",
    text: "Manage your application easily with Adminizer Admin Panel."
  },
  translation: {
    locales: ["en"],
    defaultLocale: "en",
  },
  administrator: {
    login: "admin",
    password: "admin123",
  },
  showVersion: true,
};

module.exports = config;
```


```javascript

{
    models: {
        [key:string]: {
            title: string
            model: string // Model name
            hide: boolean // Hide model in left navbar
            fields: {
                [key: string]: {
                    title: string
                    type: FieldsTypes // all fields types are below this config
                    tooltip: string // Field description
                    // Options for widgets like 'Navigation', 'Schedule' and 'FileUploader'. For more
                    // information open Navigation.md or Schedule.md
                    options: NavigationOptionsField | ScheduleOptionsField | FileUploaderOptionsField
                    displayModifier: ()=>void // Function that makes data modification on list view
                }[] | boolean | string
            }
            list: { // List display configuration
                fields: {
                    [key: string]: {
                        title: string
                        type: FieldsTypes // all fields types are below this config
                        tooltip: string // Field description
                        // Options for widgets like 'Navigation', 'Schedule' and 'FileUploader'. For more
                        // information open Navigation.md or Schedule.md
                        options: NavigationOptionsField | ScheduleOptionsField | FileUploaderOptionsField
                        displayModifier: ()=>void // Function that makes data modification on list view
                    }[] | boolean | string
                }
                actions: { // Actions configuration that will be displayed
                    global: {
                        id: string
                        title: string
                        link: string
                        icon: string
                        // Only for view, controller still uses his own access rights token
                        accessRightsToken: string
                    }[]
                    inline: {
                        id: string
                        title: string
                        link: string
                        icon: string
                        // Only for view, controller still uses his own access rights token
                        accessRightsToken: string
                    }[]
                }
            } | boolean
            // Configuration for 'create model' action or disabling/enabling it
            add: {
                fields: {
                    [key: string]: {
                        title: string
                        type: FieldsTypes // all fields types are below this config
                        tooltip: string // Field description
                        // Options for widgets like 'Navigation', 'Schedule' and 'FileUploader'. For more
                        // information open Navigation.md or Schedule.md
                        options: NavigationOptionsField | ScheduleOptionsField | FileUploaderOptionsField
                        displayModifier: ()=>void // Function that makes data modification on list view
                    }[] | boolean | string
                }
                modelModifier: ()=>void // callback for data modification before saving record
                controller: string // path to custom controller
            } | boolean
            // Configuration for 'update model' action or disabling/enabling it
            edit: {
                fields: {
                    [key: string]: {
                        title: string
                        type: FieldsTypes // all fields types are below this config
                        tooltip: string // Field description
                        // Options for widgets like 'Navigation', 'Schedule' and 'FileUploader'. For more
                        // information open Navigation.md or Schedule.md
                        options: NavigationOptionsField | ScheduleOptionsField | FileUploaderOptionsField
                        displayModifier: ()=>void // Function that makes data modification on list view
                    }[] | boolean | string
                }
                modelModifier: ()=>void // callback for data modification before saving record
                controller: string // // path to custom controller
            } | boolean
            remove: boolean // Disabling/enabling 'delete model' action
            view: boolean // Disabling/enabling 'read model' action
            tools: { // Model actions displayed in left navbar for specific model
                id: string
                title: string
                link: string
                icon: string
                // Only for view, controller still uses his own access rights token
                accessRightsToken: string
            }[]
            icon: string // Model icon
            identifierField: string // Force set primary key
            titleField: string // Title field to replace ID in relation and display in list
        }[]
    }
    sections: { // For custom adminpanel sections, displays inside header
        id: string
        title: string
        link: string
        icon: string
        // Only for view, controller still uses his own access rights token
        accessRightsToken: string
    }[]
    routePrefix: string // Route prefix for adminpanel, admin by default
    pathToViews: string // Relative path from project root to views folder
    identifierField: string // Force set primary key
    brand: {
        link: boolean | string | {
            id: string
            title: string
            link: string
            icon: string
            // Only for view, controller still uses his own access rights token
            accessRightsToken: string
        }
    }
    navbar: { // Left-side navigation bar
        additionalLinks: { // static links shown in the sidenav panel
            id: string
            title: string
            link: string
            type: 'self' | 'blank'
            icon?: string
            section?: string
            accessRightsToken?: string
            subItems?: HrefConfig[]
        }[]
        // Called after all links (static + model-generated) are collected. Returns final array.
        handleAdditionalLinks: (user: User, allLinks: HrefConfig[]) => HrefConfig[]
        // Per-section handlers, applied after all links are collected.
        sectionHandlers: {
            [section: string]: (user: User, links: HrefConfig[]) => HrefConfig[]
        }
    }
    // Policies that will be executed before going to every page
    policies: string | string[] | Function | Function[]
    styles: string[] // custom adminpanel styles
    script: { // custom adminpanel scripts
        header: string[]
        footer: string[]
    }
    welcome: { // Text for welcome page
        title: string
        text: string
    }
    translation: { // Text translation
        locales: string[] // Locales list
        directory: string // Relative path from project root to translations folder
        defaultLocale: string // Default locale
    }
    // default administrator login credentials, will be used if no admin profiles found
    administrator: {
        login: string
        password: string
    }
    // Legacy configuration-driven forms are no longer used starting with Adminizer 5.
    // Enable/disable displaying createdAt and updatedAt fields in `edit` and `add` sections
    showORMtime: boolean
    package: any // Adminpanel package.json config
    timezones: { // Available timezones list
        id: string
        name: string
    }[]
    showVersion: boolean // Show adminpanel version on the bottom of navbar
}
```

### FieldsTypes

string, password, date, datetime, time, integer, number, float, color, email, month, week,
range, boolean, binary, text, longtext, mediumtext, ckeditor, wysiwyg, texteditor, word,
jsoneditor, json, array, object, ace, html, xml, aceeditor, image, images, file, files, table
menu, navigation, schedule, worktime, association, "association-many", select, select-many


### Only routes create
If the value of the model key is `true: boolean` then only add and edit routers will be created, as well as the corresponding rights for them


# Custom links
You can add custom links into your admin panel pages.

You could use:
- `additionalLinks` in `navbar` to define static links in the sidenav panel
- `handleAdditionalLinks(user, allLinks)` in `navbar` to filter or transform all navbar links (static + model-generated) after all links are collected
- `sectionHandlers` in `navbar` to apply a handler to links of a specific section, after all links are collected
- `global` or `inline` actions in `actions` property of `list` view
- `tools` property to create link like Model submenu

## Action buttons

```javascript
module.exports.adminpanel = {
    navbar: {
        additionalLinks: [
            {
                id: '1',
                title: "First action",
                link: string,
                icon: "",
                subItems: HrefConfig[], // second level links like Model tools
                accessRightsToken: "firstLinkToken"
            }
        ]
    },
    models: {
        pages: {
            title: 'MediaManager',
            model: 'Item',
            tools: [
                {
                    id: "0",
                    link: "/",
                    title: "Some new action",
                    icon: "ok",
                    accessRightsToken: "someLinkToken"
                }
            ],

            list: {
                actions: {
                    // Actions in top right corner
                    global: [
                        {
                            id: '2',
                            link: '/',
                            title: 'Some new action',
                            icon: 'ok',
                            accessRightsToken: "secondLinkToken"
                        }
                    ],
                    // Inline actions for every
                    inline: [
                        {
                            id: '2',
                            link: '/',
                            title: 'Something', // Will be added as alt to img
                            icon: 'trash',
                            accessRightsToken: "thirdLinkToken"
                        }
                    ]
                }
            }
        }
    }
};
```

## Dynamic navbar links by user

Use `handleAdditionalLinks` to filter or transform the full list of navbar links (static + model-generated) based on the current user. The callback receives all links after models have been processed and must return the final array.

```javascript
module.exports.adminpanel = {
    navbar: {
        additionalLinks: [
            {
                id: "help",
                title: "Help center",
                link: "/adminizer/help",
                type: "self",
                icon: "help",
                section: "Support"
            }
        ],
        handleAdditionalLinks: function (user, allLinks) {
            const isAdministrator = Boolean(user?.isAdministrator);

            if (!isAdministrator) {
                // Remove links that require admin access
                return allLinks.filter(link => link.id !== 'audit');
            }

            return [
                ...allLinks,
                {
                    id: "audit",
                    title: "Audit log",
                    link: "/adminizer/history",
                    type: "self",
                    icon: "history",
                    accessRightsToken: "read-history",
                    section: "Monitoring"
                }
            ];
        }
    }
};
```

## Per-section link handlers

Use `sectionHandlers` to apply a handler only to links belonging to a specific section. Each handler receives the links of that section and the current user, and returns the filtered or modified list. Handlers run after all links (static + model-generated) are collected.

```javascript
module.exports.adminpanel = {
    navbar: {
        additionalLinks: [
            {
                id: "status",
                title: "System status",
                link: "https://status.example.com",
                type: "blank",
                icon: "monitoring",
                section: "Support"
            }
        ],
        sectionHandlers: {
            Support: function (user, links) {
                // Only show support links to non-admin users
                if (user?.isAdministrator) return [];
                return links;
            },
            Platform: function (user, links) {
                // Filter platform links based on user group
                return links.filter(link =>
                    !link.accessRightsToken || user?.groups?.includes('editors')
                );
            }
        }
    }
};
```

All links can be assigned to a sidebar section via `section` field on `HrefConfig`:
```javascript
{
    id: "billing",
    title: "Billing",
    link: "/adminizer/billing",
    type: "self",
    section: "Finance"
}
```

Order of processing:
1. Static `additionalLinks` are added to the navbar
2. Model-generated links are appended
3. `handleAdditionalLinks(user, allLinks)` is applied to the full list
4. `sectionHandlers` are applied per section

# Edit callback

ModelModifier - function in adminpanel config edit sections for modification Model data
before save in database.

```
module.exports.adminpanel = {
    models: {
        users: {
            title: 'Users',
            model: 'User',
            add: {
                fields: {
                },
                // saved object to be modificated before save in database
                ModelModifier: function (Model) {
                    Model.human_edited = true;
                    return Model;
                },
            }
        }
    }
}

```


# Display modifier

It uses to manage fields' views

```javascript
displayModifier: function (data) {
    // for list view
    if (Array.isArray(data)) {
        data = data.map((item) => {return item.label + item.date})
        return data.join(',')
    }
    // for edit view    
    return data.label + data.date
}
```
