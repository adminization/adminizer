import fs from "fs";
import path from "path";
import {vsprintf} from "sprintf-js";
import {Adminizer} from "./Adminizer";

type LocaleData = { [key: string]: any };

type I18nOptions = {
    locales?: string[];
    defaultLocale?: string;
    directory?: string;
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
    private directory: string;
    private extension: string;
    private cookieName: string;
    private sessionVarName: string;
    private indent: string;
    private request?: any;
    private prefLocale?: string;

    static localeCache: Record<string, LocaleData> = {};
    static resMethods: Array<keyof I18n> = ["__", "__n", "getLocale", "isPreferredLocale"];

    constructor(options: I18nOptions = {}) {
        this.devMode = process.env.NODE_ENV !== "production";

        this.defaultLocale = options.defaultLocale || "en";
        this.directory = options.directory || path.join(import.meta.filename, '../../translations');
        this.extension = options.extension || ".json";
        this.cookieName = options.cookieName || "lang";
        this.sessionVarName = options.sessionVarName || "locale";
        this.indent = options.indent || "\t";

        if (options.locales) {
            options.locales.forEach((locale) => this.readFile(locale));
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
            I18n.locales[locale] = I18n.locales[locale] || {};
            I18n.locales[locale][singular] = plural ? {one: singular, other: plural} : singular;
            this.writeFile(locale);
        }
        return translation || (plural ? {one: singular, other: plural} : singular);
    }

    private readFile(locale: string): void {
        const file = this.locateFile(locale);

        if (!this.devMode && I18n.localeCache[file]) {
            I18n.locales[locale] = I18n.localeCache[file];
            return;
        }

        try {
            const data = fs.readFileSync(file, "utf8");
            I18n.locales[locale] = JSON.parse(data);
            if (!this.devMode) {
                I18n.localeCache[file] = I18n.locales[locale];
            }
        } catch (error) {
            if (this.devMode) {
                Adminizer.log.warn(`Failed to read locale file ${file}:`, error);
            }
            I18n.locales[locale] = {};
        }
    }

    private writeFile(locale: string): void {
        if (!this.devMode) return;

        const file = this.locateFile(locale);
        const tmpFile = `${file}.tmp`;
        const dir = path.dirname(file);

        try {
            fs.mkdirSync(dir, {recursive: true});
            fs.writeFileSync(tmpFile, JSON.stringify(I18n.locales[locale], null, this.indent), "utf8");
            fs.renameSync(tmpFile, file);
        } catch (error) {
            Adminizer.log.error(`Failed to write locale file ${file}:`, error);
        }
    }

    private locateFile(locale: string): string {
        return path.normalize(`${this.directory}/${locale}${this.extension}`);
    }

    public static appendLocale(locale: string, data: any) {
        I18n.locales[locale] = {...I18n.locales[locale], ...data};
    }

    public static getLocales() {
        return this.locales
    }
}
