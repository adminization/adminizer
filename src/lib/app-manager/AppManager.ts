// AppManager.ts
import { Adminizer } from "../Adminizer";
import { AbstractAdminizerApp } from "./AdminizerApp";
import { AppController } from "./AdminizerApp";
import { WidgetDescriptor } from "./AdminizerApp";
import { CatalogDescriptor } from "./AdminizerApp";
import { MediaManagerProvider } from "./AdminizerApp";

interface InstalledApp {
    app: AbstractAdminizerApp;
    disposers: Array<() => void>;
}

export class AppManager {
    private installedApps = new Map<string, InstalledApp>();

    constructor(private adminizer: Adminizer) {}

    /**
     * Установка приложения
     */
    async install(app: AbstractAdminizerApp): Promise<void> {
        console.log(`\n📦 [AppManager] Installing app: ${app.name} v${app.version}`);

        // Удаляем старую версию если есть
        if (this.installedApps.has(app.name)) {
            await this.uninstall(app.name);
        }

        const disposers: Array<() => void> = [];

        // 1. Регистрируем контроллеры
        if (app.controllers?.length) {
            this.registerControllers(app.controllers, disposers);
        }

        // 2. Регистрируем виджеты
        if (app.widgets?.length) {
            this.registerWidgets(app.widgets, disposers);
        }

        // 3. Регистрируем каталоги
        if (app.catalogs?.length) {
            this.registerCatalogs(app.catalogs, disposers);
        }

        // 4. Регистрируем медиа менеджеры
        if (app.mediaManagers?.length) {
            this.registerMediaManagers(app.mediaManagers, disposers);
        }

        // 5. Регистрируем контролы
        if (app.controls?.length) {
            this.registerControls(app.controls, disposers);
        }

        // 6. Регистрируем history adapters
        if (app.historyAdapters?.length) {
            this.registerHistoryAdapters(app.historyAdapters, disposers);
        }

        // 7. Регистрируем notification services
        if (app.notifications?.length) {
            this.registerNotifications(app.notifications, disposers);
        }

        // 8. Вызываем кастомную регистрацию (если есть)
        if (app.onRegister) {
            const customDisposers = app.onRegister(this.adminizer);
            if (customDisposers && Array.isArray(customDisposers)) {
                disposers.push(...customDisposers);
            }
        }

        // 9. Вызываем хук onInstall
        if (app.onInstall) {
            await app.onInstall(this.adminizer);
        }

        // Сохраняем
        this.installedApps.set(app.name, { app, disposers });

        console.log(`✅ [AppManager] App ${app.name} installed successfully (${disposers.length} resources registered)\n`);
    }

    /**
     * Удаление приложения
     */
    async uninstall(appName: string): Promise<void> {
        const installed = this.installedApps.get(appName);
        if (!installed) {
            console.warn(`⚠️ [AppManager] App ${appName} not found`);
            return;
        }

        console.log(`\n🗑️ [AppManager] Uninstalling app: ${appName}`);

        // 1. Вызываем хук onUninstall
        if (installed.app.onUninstall) {
            await installed.app.onUninstall();
        }

        // 2. Вызываем все disposers в обратном порядке
        installed.disposers.reverse().forEach(dispose => {
            try {
                dispose();
            } catch (err) {
                console.error(`Error during dispose:`, err);
            }
        });

        // 3. Удаляем из Map
        this.installedApps.delete(appName);

        console.log(`✅ [AppManager] App ${appName} uninstalled successfully\n`);
    }

    /**
     * Переустановка (для hot reload)
     */
    async reinstall(app: AbstractAdminizerApp): Promise<void> {
        await this.uninstall(app.name);
        await this.install(app);
    }

    /**
     * Получить список установленных приложений
     */
    getInstalledApps(): string[] {
        return Array.from(this.installedApps.keys());
    }

    /**
     * Получить приложение по имени
     */
    getApp(name: string): AbstractAdminizerApp | undefined {
        return this.installedApps.get(name)?.app;
    }

    // ========== Приватные методы регистрации ==========

    private registerControllers(controllers: AppController[], disposers: Array<() => void>): void {
        console.log(`  🎮 Registering ${controllers.length} controller(s)...`);

        for (const controller of controllers) {
            const fullPath = `${this.adminizer.config.routePrefix}${controller.route}`;
            const method = controller.method.toLowerCase();

            console.log(`    → ${method.toUpperCase()} ${fullPath}`);

            // Регистрируем роут в Express
            this.adminizer.app[method](fullPath, controller.middleware());

            // Сохраняем disposer для удаления
            disposers.push(() => {
                console.log(`    ✖ Removing route: ${method.toUpperCase()} ${fullPath}`);
                this.removeRoute(fullPath, method);
            });
        }
    }

    private registerWidgets(widgets: WidgetDescriptor[], disposers: Array<() => void>): void {
        console.log(`  📊 Registering ${widgets.length} widget(s)...`);

        for (const widget of widgets) {
            const widgetId = widget.widget.id || widget.widget.name;
            console.log(`    → Widget: ${widgetId}`);

            // Используем widgetHandler Adminizer
            this.adminizer.widgetHandler.registerWidget(widget.widget);

            disposers.push(() => {
                console.log(`    ✖ Unregistering widget: ${widgetId}`);
                this.adminizer.widgetHandler.unregisterWidget(widgetId);
            });
        }
    }

    private registerCatalogs(catalogs: CatalogDescriptor[], disposers: Array<() => void>): void {
        console.log(`  📚 Registering ${catalogs.length} catalog(s)...`);

        for (const catalog of catalogs) {
            const catalogName = catalog.catalog.name;
            console.log(`    → Catalog: ${catalogName}`);

            this.adminizer.catalogHandler.registerCatalog(catalog.catalog);

            disposers.push(() => {
                console.log(`    ✖ Unregistering catalog: ${catalogName}`);
                this.adminizer.catalogHandler.unregisterCatalog(catalogName);
            });
        }
    }

    private registerMediaManagers(providers: MediaManagerProvider[], disposers: Array<() => void>): void {
        console.log(`  🖼️ Registering ${providers.length} media manager(s)...`);

        for (const provider of providers) {
            console.log(`    → Media manager`);

            this.adminizer.mediaManagerHandler.registerProvider(provider);

            disposers.push(() => {
                console.log(`    ✖ Unregistering media manager`);
                this.adminizer.mediaManagerHandler.unregisterProvider();
            });
        }
    }

    private registerControls(controls: AbstractControls[], disposers: Array<() => void>): void {
        console.log(`  🎛️ Registering ${controls.length} control(s)...`);

        for (const control of controls) {
            console.log(`    → Control: ${control.name}`);

            this.adminizer.controlsHandler.registerControl(control);

            disposers.push(() => {
                console.log(`    ✖ Unregistering control: ${control.name}`);
                this.adminizer.controlsHandler.unregisterControl(control.name);
            });
        }
    }

    private registerHistoryAdapters(adapters: AbstractHistoryAdapter[], disposers: Array<() => void>): void {
        console.log(`  📜 Registering ${adapters.length} history adapter(s)...`);

        for (const adapter of adapters) {
            console.log(`    → History adapter`);

            this.adminizer.historyHandler.registerAdapter(adapter);

            disposers.push(() => {
                console.log(`    ✖ Unregistering history adapter`);
                this.adminizer.historyHandler.unregisterAdapter();
            });
        }
    }

    private registerNotifications(services: AbstractNotificationService[], disposers: Array<() => void>): void {
        console.log(`  🔔 Registering ${services.length} notification service(s)...`);

        for (const service of services) {
            console.log(`    → Notification service`);

            this.adminizer.notificationHandler.registerService(service);

            disposers.push(() => {
                console.log(`    ✖ Unregistering notification service`);
                this.adminizer.notificationHandler.unregisterService();
            });
        }
    }

    /**
     * Удаление роута в Express (обходной путь)
     */
    private removeRoute(path: string, method: string): void {
        // Express не поддерживает удаление роутов напрямую
        // Пытаемся найти и удалить layer из router.stack
        const router = this.adminizer.app._router;
        if (router?.stack) {
            const layers = router.stack;
            for (let i = 0; i < layers.length; i++) {
                const layer = layers[i];
                if (layer.route?.path === path && layer.route?.methods[method]) {
                    router.stack.splice(i, 1);
                    console.log(`      ✓ Route removed from stack`);
                    return;
                }
            }
        }
        console.warn(`      ⚠️ Could not remove route, will remain in memory`);
    }
}