import {Adminizer} from "../Adminizer";
import {AbstractCatalog} from "../catalog/AbstractCatalog";
import {AbstractControls} from "../controls/AbstractControls";
import {AbstractHistoryAdapter} from "../history-actions/AbstractHistoryAdapter";
import {AbstractMediaManager} from "../media-manager/AbstractMediaManager";
import {AbstractNotificationService} from "../notifications/AbstractNotificationService";
import {BaseWidget} from "../widgets/abstractWidgetBase";

export interface AppController {
    route: string;
    method: string;
    middleware: (req: unknown, res: unknown) => unknown | Promise<unknown>
}

export interface CatalogDescriptor {
    catalog: AbstractCatalog;
}

export interface ControlsDescriptor {
    control: AbstractControls;
}

export interface HistoryDescriptor {
    history: AbstractHistoryAdapter;
}

export interface MediaManagerProvider {
    mediaManager: AbstractMediaManager;
}

export interface NotificationDescriptor {
    service: AbstractNotificationService;
}

export interface WidgetDescriptor {
    widget: BaseWidget;
}

export abstract class AbstractAdminizerApp {
    abstract readonly name: string;
    abstract readonly version: string;

    abstract readonly controllers?: AppController[];
    abstract readonly catalogs?: CatalogDescriptor[];
    abstract readonly controls?: ControlsDescriptor[];
    abstract readonly historyAdapters?: AbstractHistoryAdapter[];
    abstract readonly mediaManagers?: MediaManagerProvider[];
    abstract readonly notifications?: NotificationDescriptor[];
    abstract readonly widgets?: WidgetDescriptor[];
    abstract readonly config?: Record<string, unknown>

    protected constructor(protected adminizer: Adminizer) {}

    /**
     * Хук, вызываемый после установки приложения
     * @param adminizer - экземпляр Adminizer для доступа к его API
     */
    onInstall?(adminizer: Adminizer): void | Promise<void>;

    /**
     * Хук, вызываемый перед удалением приложения
     */
    onUninstall?(): void | Promise<void>;

    /**
     * Хук для кастомной регистрации (если стандартных массивов недостаточно)
     * @param adminizer - экземпляр Adminizer
     * @returns массив disposer-функций для очистки
     */
    onRegister?(adminizer: Adminizer): Array<() => void> | void;

}