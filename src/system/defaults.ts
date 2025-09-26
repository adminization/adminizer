'use strict'
import {AdminpanelConfig} from "../interfaces/adminpanelConfig";
import {FileStorageHelper} from "../helpers/fileStorageHelper";
import timezones from "../lib/timezones";
import {NavigationAP} from "../models/NavigationAP";

/**
 * Default admin config
 */
let adminpanelConfig: AdminpanelConfig = {
    /** Default route prefix */
    routePrefix: '/adminizer',

    /**
     * Name of model identifier field
     */
    identifierField: 'id',

    /**
     * Policies
     */
    policies: [],

    /**
     * Base navbar configuration
     */
    navbar: {
        // List of additional actions
        additionalLinks: []
    },

    brand: {
        link: null
    },

    /**
     * List of admin pages
     */
    models: {
        UserAP: {
            title: "Users",
            model: "userap",
            icon: "people",
            navbar: {
                section: "System"
            },
            add: {
                controller: "../controllers/addUser"
            },
            edit: {
                controller: "../controllers/editUser"
            },
            fields: {
                login: {
                    title: 'User login',
                },
                fullName: {
                    title: 'Full Name'
                },
                password: {
                    title: 'Password',
                },
                isAdministrator: {
                    title: 'is administrator'
                },
                isConfirme: {
                    title: 'is confirme'
                }
            },
            list: {
                fields: {
                    createdAt: false,
                    updatedAt: false,
                    id: false,
                    email: false,
                    passwordHashed: false,
                    timezone: false,
                    locale: false,
                    isDeleted: false,
                    isActive: false,
                    groups: false
                }
            }
        },
        GroupAP: {
            title: "Groups",
            model: "groupap",
            icon: "group_add",
            navbar: {
                section: "System"
            },
            add: {
                controller: "../controllers/addGroup"
            },
            edit: {
                controller: "../controllers/editGroup"
            },
            list: {
                fields: {
                    createdAt: false,
                    updatedAt: false,
                    id: false,
                }
            }
        }
    },

    translation: {
        locales: ['en', 'ru'],
        path: `config/locales/adminpanel`,
        defaultLocale: 'en'
    },

    forms: {
        path: `api/adminpanel-forms`,
        data: {},
        get: async function (slug, key) {
            return FileStorageHelper.get(slug, key)
        },
        set: async function (slug, key, value) {
            FileStorageHelper.set(slug, key, value)
        }
    },

    /**
     * List of sections in head
     */
    sections: [],
    package: {version: "4.0.0"},
    showVersion: true,
    timezones: timezones,
    styles: [],
    scripts: {
        header: [],
        footer: []
    },

    security: {
        csrf: true
    },

    registration: {
        enable: false,
        defaultUserGroup: "guest",
        confirmationRequired: true
    },

    auth: {
        enable: false,
        captcha: true
    },
    bind: {
        public: true
    },
    notifications: {
        enabled: false
    },
    aiAssistant: {
        enabled: false,
        defaultModel: 'dummy',
        models: ['dummy']
    }
}


export function setDefaultConfig(config: AdminpanelConfig) {
    adminpanelConfig = config;
}

export function getDefaultConfig() {
    return adminpanelConfig;
}

export function defaults() {
    return {
        adminpanel: adminpanelConfig
    }
}
