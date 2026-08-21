import { AdminpanelConfig } from "../dist";

export const routePrefix = "/adminizer";

const models: AdminpanelConfig["models"] = {
    Test: {
        title: 'Test model',
        model: 'test',
        displayName: 'title',
        // userAccessRelation: 'owner',
        fields: {
            createdAt: {
                visible: false
            },
            updatedAt: {
                visible: false
            },
            title: {
                title: 'Title',
                type: 'string',
                required: true
            },
            mediamanager: {
                title: 'Images',
                type: 'mediamanager',
                options: {
                    id: "default",
                    group: 'banner',
                    accept: ['image/jpeg', 'image/png']
                }
            },
            schema: {}
        },
        list: {
            fields: {
                id: {
                    visible: false
                },
            }
        },
        add: {
            // fields: {
            //     ownerId: false,
            //     exampleId: false
            // }
        },
        icon: 'receipt'
    },
    full: {
        title: 'All controls',
        model: 'example',
        displayName: 'description',
        filters: {
            enabled: true,
            excludeFromFilters: ['createdAt', 'id', 'ownerId', 'testRelation', 'testRelationExample'],
        },
        // userAccessRelation: 'owner',
        // tools: [
        //     {
        //         id: '1',
        //         link: `https://google.com`,
        //         type: 'blank',
        //         title: 'Some new action',
        //         icon: 'reorder',
        //     },
        // ],
        fields: {
            createdAt: {
                title: 'created At',
                type: 'string',
            },
            updatedAt: {
                visible: false
            },
            title: {
                title: 'Title',
                type: 'string',
                required: true,
                // inlineEditable: false
            },
            tui: {
                type: 'tuieditor',
                options: {
                    name: 'toast-ui',
                    config: {
                        hideModeSwitch: true,
                        // previewStyle: 'vertical',
                        initialEditType: 'wysiwyg',
                        height: '800px'
                    },
                }
            },
            description: {
                title: 'Textarea',
                type: 'text',
                required: true,
                tooltip: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Hic, nisi.'
            },
            sort: {
                type: 'boolean',
                title: 'Boolean',
                // inlineEditable: true
            },
            disabled_text: {
                title: 'Disabled',
                type: 'text',
                disabled: true,
                tooltip: 'This field should be disabled'
            },
            range: {
                type: 'range',
                title: 'Range',
                options: {
                    min: 10,
                    max: 80
                },
                // inlineEditable: true
            },
            select: {
                title: 'Select',
                type: "select",
                isIn: {
                    decrease: 'Уменьшение баллов',
                    increase: 'Увеличение баллов',
                    none: 'Без изменений'
                },
                // isIn: [
                //     "decrease",
                //     "increase",
                //     "none",
                // ],
            },
            date: {
                title: 'Date',
                type: 'date',
            },
            month: {
                title: 'Month',
                type: 'month',
            },
            datetime: {
                title: 'Date and time',
                type: 'datetime',
            },
            time: {
                title: 'time',
                type: 'time',
            },
            number: {
                title: 'Number',
                type: 'number',
                // inlineEditable: true
            },
            color: {
                title: 'color',
                type: 'color',
            },
            week: {
                title: 'Week',
                type: 'week',
            },
            json: {
                type: 'jsoneditor',
                customFilter: {
                    handlerId: 'Example.json',
                    label: 'Custom filtering'
                }
            },
            code: {
                title: 'Code',
                type: 'code',
                options: {
                    name: 'monaco',
                    config: {
                        language: 'typescript',
                    }
                }
            },
            geojson: {
                type: 'geo-polygon',
            },
            datatable: {
                title: 'Price',
                type: 'table',
                customFilter: {
                    handlerId: 'Example.datatable'
                },
                options: {
                    config: {
                        dataSchema: { name: null, footage: null, price: null },
                        colHeaders: ['One', 'Two', 'Three'],
                        columns: [
                            { data: 'name' },
                            { data: 'footage' },
                            { data: 'price' }
                        ],
                    }
                },
            },
            selectMany: {
                title: 'Select many',
                isIn: ['Sone', 'Stwo', 'Sthree', 'Sfour', 'Sfive'],
                type: 'select-many'
            },
            editor: {
                title: 'Editor',
                type: 'wysiwyg',
                options: {
                    name: 'react-quill',
                    config: {},
                    // name: 'ckeditor',
                    // config: {
                    //     items: [
                    //         // 'sourceEditing', // This is for test, see full list of items in src/lib/controls/wysiwyg/CKeditor.ts
                    //         // 'showBlocks',
                    //         // '|',
                    //         'heading',
                    //         '|',
                    //         'bold',
                    //         'italic',
                    //         'underline',
                    //         '|',
                    //         // 'horizontalLine',
                    //         'link',
                    //         'insertImage',
                    //         'insertTable',
                    //         'blockQuote',
                    //         '|',
                    //         'alignment',
                    //         '|',
                    //         'bulletedList',
                    //         'numberedList',
                    //         'outdent',
                    //         'indent',
                    //     ]
                    // }
                }
            },
            testRelationExample: {
                title: 'Test one association',
                displayModifier: function (data) {
                    return data?.title;
                },
                disabled: false
            },
            tests: {
                title: 'One to many association',
                displayModifier: function (data: any) {
                    if (Array.isArray(data)) {
                        return data
                            .map((item: any) => item?.title)
                            .filter(Boolean)
                            .join(', ');
                    }
                    return data?.title || '';
                },
                disabled: false
            },
            owner: {
                title: 'Owner',
                displayModifier: function (data: any) {
                    return data?.login || '';
                },
                disabled: false
            },
        },
        list: {
            fields: {
                // json: false,
                // tui: false,
                // geojson: false,
                // week: false,
                // color: false,
                // range: false,
                // date: false,
                // month: false,
                // selectMany: false,
                // select: false,
                // testRelation: false,
                // tests: false,
                // price: false,
                // code: false,
                // datatable: false
            },
            actions: {
                global: [
                    {
                        id: "1",
                        link: 'https://google.com',
                        type: 'blank',
                        title: 'Google',
                        icon: 'insert_link'
                    }, {
                        id: "2",
                        link: 'https://google.com',
                        type: 'blank',
                        title: 'Google',
                        icon: 'insert_link'
                    }, {
                        id: "3",
                        link: 'https://google.com',
                        type: 'blank',
                        title: 'Google',
                        icon: 'insert_link'
                    }, {
                        id: "4",
                        link: 'https://google.com',
                        type: 'blank',
                        title: 'Google',
                        icon: 'insert_link'
                    },
                ],
                inline: [
                    {
                        id: "1",
                        link: 'https://google.com',
                        type: 'blank',
                        title: 'Google',
                        icon: 'insert_link'
                    },
                    {
                        id: "2",
                        link: 'https://google.com',
                        type: 'blank',
                        title: 'Google1',
                        icon: 'insert_link'
                    },
                    {
                        id: "3",
                        link: 'https://google.com',
                        type: 'blank',
                        title: 'Google2',
                        icon: 'insert_link'
                    },
                    {
                        id: "4",
                        link: `${routePrefix}/model/example/edit`,
                        type: 'self',
                        title: 'Test Edit',
                        icon: 'insert_link'
                    }
                ]
            }
        },
        icon: 'inbox'
    },
    JsonSchema: {
        title: 'Json schema',
        model: 'jsonschema',
        navbar: {
            groupsAccessRights: ["admins"]
        },
        fields: {
            data: {
                type: 'json',
                options: {
                    name: 'jsoneditor',
                    config: {
                        schema: {
                            'type': 'array',
                            "minItems": 1,
                            'items': {
                                '$ref': '#/definitions/badge'
                            },
                            'definitions': {
                                'badge': {
                                    'type': 'object',
                                    'additionalProperties': false,
                                    'properties': {
                                        'text': {
                                            'type': 'string',
                                            'minLength': 3,
                                            'maxLength': 18
                                        },
                                        'color': {
                                            'type': 'string',
                                            'pattern': '^#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$'
                                        },
                                        'textColor': {
                                            'type': 'string',
                                            'pattern': '^#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$'
                                        }
                                    },
                                    'required': [
                                        'color',
                                        'text',
                                        'textColor'
                                    ]
                                }
                            }
                        },
                        mode: 'tree',
                        // json: []
                        // json: [
                        //     {text: 'Gray badge', color: '#808080', textColor: '#FFFFFF'},
                        //     {text: 'Silver badge', color: '#C0C0C0', textColor: '#000000'},
                        //     {text: 'White badge', color: '#FFFFFF', textColor: '#000000'},
                        //     {text: 'Fuchsia badge', color: '#FF00FF', textColor: '#000000'}
                        // ]
                    }
                },
            }
        },

        icon: 'pets'
    },
    Category: {
        title: 'Категории',
        model: 'category',
        icon: 'category',
        displayName: (data: any) => {
            return data?.slug ?? 'no data'
        },
        fields: {
            createdAt: {
                title: 'Created at',
            },
            updatedAt: {
                visible: false
            },
            mediamanager_one: {
                title: 'Images 1',
                type: 'mediamanager',
                options: {
                    id: "default",
                    group: 'banner',
                    accept: ['image/svg+xml']
                }
            },
            mediamanager_two: {
                title: 'Images 2',
                type: 'mediamanager',
                options: {
                    id: 'default',
                    group: 'avatars',
                    initTab: 'table-application',
                    accept: ['image/jpeg']
                },
                displayModifier: function (data: any) {
                    if (data?.length) {
                        return `<img width="100px" height="100px" style="margin: 0 auto" src="${routePrefix}/get-thumbs?id=${data[0].id}&managerId=default"/>`;
                    } else {
                        return `<p>No Image</p>`;
                    }
                }
            },
            single_file: {
                type: 'single-file',
                title: 'Single file',
                options: {
                    id: 'default',
                    group: 'single-file',
                    accept: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
                    onlyView: true
                },
            }
        },
        add: true,
        edit: true,
        view: true,
        remove: true
    },
    TestCatalog: {
        title: '',
        model: 'testcatalog',
        icon: 'category',
        navbar: {
            visible: false,
        },
        fields: {
            createdAt: {
                visible: false
            },
            updatedAt: {
                visible: false
            }
        }
    }
}

const config: AdminpanelConfig = {
    list: {
        defaultPageSize: 5
    },
    filters: {
        enabled: true
    },
    system: {
        defaultORM: process.env.ORM ?? "sequelize",
        internalModelAccess: {
            "test-catalog": ["TestCatalog", 'Category']
        }
    },
    mediamanager: {
        fileStoragePath: '.tmp/public',
        allowMIME: ['image/*', 'application/*', 'text/*', 'video/*'],
        maxByteSize: 1024 * 1024 * 2, // 2 Mb
        imageSizes: {
            lg: {
                width: 750,
                height: 750
            },
            sm: {
                width: 350,
                height: 350
            }
        },
    },
    notifications: {
        enabled: true,
        enableGeneral: true,
        initTab: 'general',
    },
    history: {
        enabled: true,
        adapter: "default",
        excludeModels: ["TestCatalog"]
    },
    cors: {
        enabled: false,
        origin: 'http://localhost:3000',
        path: 'api/*'
    },
    aiAssistant: {
        enabled: (process.env.ENABLE_AI_ASSISTANT ?? 'true') === 'true',
        defaultModel: 'openharness',
        models: ['openharness', 'openai-data', 'dummy'],
    },
    // Demo knowledge base; the implementation is registered in fixture/index.ts
    documentation: {
        enabled: true,
    },
    routePrefix: routePrefix,
    // routePrefix: "/admin",
    auth: {
        enable: true
    },
    registration: {
        enable: true,
        defaultUserGroup: "guest",
        confirmationRequired: false
    },
    dashboard: {
        // Widgets are initialized and configured in local_modules/core/lib/adminpanel/widgets
        // defaultWidgets will be populated by core module
        defaultWidgets: [
            'action_one',
            'info_one',
            'app_info_widget',
            'app_switcher_widget',
            'app_action_widget',
            'app_link_widget',
            'app_custom_counter',
            'siteLinks',
            'site_custom',
            'site_switcher'
        ],
        autoloadWidgetsPath: 'fixture/widgets'
    },
    navbar: {
        additionalLinks: [
            {
                id: '5',
                type: "self",
                link: `${routePrefix}/catalog/test-catalog`,
                title: 'Test Catalog',
                icon: 'bug_report'
            }
        ]
    },
    sections: [
        {
            id: "0",
            title: 'Website 1',
            link: '#',
            type: 'self',
            icon: 'circle',
            subItems: [
                {
                    id: "0",
                    title: 'Sub 1',
                    type: 'blank',
                    link: 'https://example.com',
                    icon: 'language'
                },
                {
                    id: "1",
                    title: 'Sub 2',
                    link: 'https://google.com',
                    type: 'blank',
                    icon: 'share'
                },
                {
                    id: "3",
                    title: 'Sub 4',
                    link: 'https://google.com',
                    type: 'blank',
                    icon: 'insert_link'
                }
            ]
        },
        {
            id: "1",
            title: 'Website 2 Website 2 Website 2',
            link: 'https://example.com',
            type: 'blank',
            icon: 'insert_link'
        },
        {
            id: "2",
            title: 'Website 3',
            type: 'blank',
            link: 'https://example.com',
            icon: 'share'
        },
        {
            id: "3",
            title: 'Website 1',
            type: 'blank',
            link: 'https://example.com',
            icon: 'language'
        },
        {
            id: "4",
            title: 'Website 2 Website 2 Website 2',
            type: 'blank',
            link: 'https://example.com',
            icon: 'insert_link'
        },
    ],
    brand: {
        link: {
            id: "0",
            type: 'blank',
            title: 'Demo adminpanel',
            link: 'https://example.com',
        }
    },
    welcome: {
        title: 'Demo adminpanel project',
        text: 'restaurant and delivery food solution www.example.com'
    },
    administrator: {
        login: process.env.ADMIN_LOGIN === undefined ? 'admin' : process.env.ADMIN_LOGIN,
        password: process.env.ADMIN_PASS === undefined ? '45345345FF38' : process.env.ADMIN_PASS
    },
    translation: {
        locales: ['en', 'ru', 'de', 'ua'],
        directory: 'fixture/locales', // relative path to translations directory
        // missingTranslationDirectory: 'fixture/locales_missing',
        defaultLocale: 'en'
    },
    models: models,
    //@ts-ignore
    generator: {},
    showVersion: {
        link: 'https://docs.adminizer.org',
        hint: 'Adminizer documentation',
        // text is set dynamically in fixture/index.ts (startup time)
    },
};

export default config
