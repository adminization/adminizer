import fs from "fs";
import path from "path";
import {vsprintf} from "sprintf-js";
import {Adminizer} from "./Adminizer";

type LocaleData = { [key: string]: any };

type I18nOptions = {
    locales?: string[];
    defaultLocale?: string;
    directory?: string;
    missingDirectory?: string;
    extension?: string;
    cookieName?: string;
    sessionVarName?: string;
    indent?: string;
    register?: Record<string, any>;
    request?: any;
    query?: boolean;
    session?: boolean;
    subdomain?: boolean;
};

export class I18n {
    private devMode: boolean;
    private static locales: Record<string, LocaleData> = {};
    private defaultLocale: string;
    private defaultDirectory: string;
    private directory: string;
    private customDirectory?: string;
    private missingDirectory?: string;
    private extension: string;
    private cookieName: string;
    private sessionVarName: string;
    private indent: string;
    private request?: any;
    private prefLocale?: string;

    static localeCache: Record<string, LocaleData> = {};
    static resMethods: Array<keyof I18n> = ["__", "__n", "getLocale", "isPreferredLocale"];

    constructor(options: I18nOptions = {}) {
        this.devMode = process.env.VITE_ENV === "dev";

        this.defaultLocale = options.defaultLocale || "en";
        const runtimeDefaultTranslationsPath = path.resolve(import.meta.dirname, "../translations");
        const sourceTranslationsPath = path.resolve(import.meta.dirname, "../../src/translations");
        this.defaultDirectory = this.devMode
            ? (fs.existsSync(sourceTranslationsPath) ? sourceTranslationsPath : runtimeDefaultTranslationsPath)
            : runtimeDefaultTranslationsPath;
        this.customDirectory = options.directory ? path.resolve(options.directory) : undefined;
        this.missingDirectory = options.missingDirectory ? path.resolve(options.missingDirectory) : undefined;
        this.directory = this.customDirectory || this.defaultDirectory;
        this.extension = options.extension || ".json";
        this.cookieName = options.cookieName || "lang";
        this.sessionVarName = options.sessionVarName || "locale";
        this.indent = options.indent || "\t";

        if (options.locales) {
            options.locales.forEach((locale) => {
                this.readFile(locale, this.defaultDirectory);
                if (this.customDirectory && this.customDirectory !== this.defaultDirectory) {
                    this.readFile(locale, this.customDirectory);
                }
            });
        }

        this.setLocale(this.defaultLocale);
    }

    __ = (key: string, ...args: any[]): string => {
        const msg = this.translate(this.getLocale(), key);
        return args.length > 0 ? vsprintf(msg, args) : msg;
    };

    __n = (singular: string, plural: string, count: number, ...args: any[]): string => {
        const msg = this.translate(this.getLocale(), singular, plural);
        const result = count > 1 ? msg.other : msg.one;
        return args.length > 0 ? vsprintf(result, [count, ...args]) : result;
    };

    setLocale(locale: string): string {
        if (!I18n.locales[locale]) {
            if (this.devMode) {
                Adminizer.log.warn(`Locale (${locale}) not found.`);
            }
            locale = this.defaultLocale;
        }
        return (this.request ? (this.request.locale = locale) : (this.defaultLocale = locale));
    }

    registerMethods(helpers: Record<string, any>, req: ReqType): Record<string, any> {
        I18n.resMethods.forEach(function (method) {
            if (req) {
                helpers[method] = req.i18n[method].bind(req.i18n);
            } else {
                helpers[method] = function (req: ReqType) {
                    return req.i18n[method].bind(req.i18n);
                };
            }

        });

        return helpers;
    }

    getLocale(): string {
        return this.request ? this.request.locale : this.defaultLocale;
    }

    isPreferredLocale(): boolean {
        return !this.prefLocale || this.prefLocale === this.getLocale();
    }

    translate(locale: string, singular: string, plural?: string): any {
        if (!I18n.locales[locale]) {
            if (this.devMode) {
                Adminizer.log.warn(`WARN: No locale found. Using the default (${this.defaultLocale}) as current locale`);
            }
            locale = this.defaultLocale;
        }
        const localeDictionary = I18n.locales[locale] || {};
        const translation = localeDictionary[singular];
        if (!translation && this.devMode) {
            this.writeMissingTranslation(locale, singular, plural);
        }
        return translation || (plural ? {one: singular, other: plural} : singular);
    }

    private readFile(locale: string, directory = this.directory): void {
        const file = this.locateFile(locale, directory);

        if (!this.devMode && I18n.localeCache[file]) {
            I18n.locales[locale] = {
                ...(I18n.locales[locale] || {}),
                ...I18n.localeCache[file]
            };
            return;
        }

        try {
            const data = fs.readFileSync(file, "utf8");
            const parsed = JSON.parse(data);
            I18n.locales[locale] = {
                ...(I18n.locales[locale] || {}),
                ...parsed
            };
            if (!this.devMode) {
                I18n.localeCache[file] = parsed;
            }
        } catch (error) {
            if (this.devMode) {
                Adminizer.log.warn(`Failed to read locale file ${file}:`, error);
            }
            I18n.locales[locale] = I18n.locales[locale] || {};
        }
    }

    private locateFile(locale: string, directory = this.directory): string {
        return path.normalize(`${directory}/${locale}${this.extension}`);
    }

    private writeMissingTranslation(locale: string, singular: string, plural?: string): void {
        if (!this.missingDirectory) return;

        const file = this.locateFile(locale, this.missingDirectory);
        const tmpFile = `${file}.tmp`;
        const dir = path.dirname(file);
        const value = plural ? {one: singular, other: plural} : singular;

        try {
            fs.mkdirSync(dir, {recursive: true});

            let missingTranslations: LocaleData = {};
            if (fs.existsSync(file)) {
                const data = fs.readFileSync(file, "utf8");
                missingTranslations = JSON.parse(data);
            }

            if (Object.prototype.hasOwnProperty.call(missingTranslations, singular)) {
                return;
            }

            missingTranslations[singular] = value;
            fs.writeFileSync(tmpFile, JSON.stringify(missingTranslations, null, this.indent), "utf8");
            fs.renameSync(tmpFile, file);
        } catch (error) {
            Adminizer.log.error(`Failed to write missing translation file ${file}:`, error);
        }
    }

    public static appendLocale(locale: string, data: any) {
        I18n.locales[locale] = {...I18n.locales[locale], ...data};
    }

    public static getLocales() {
        return this.locales
    }
}
