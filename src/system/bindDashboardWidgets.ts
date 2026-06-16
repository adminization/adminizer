import * as fs from 'fs';
import * as path from 'path';
import {pathToFileURL} from "url";
import {Adminizer} from '../lib/Adminizer';

export default async function bindDashboardWidgets(adminizer: Adminizer) {
    if (adminizer.config.dashboard && typeof adminizer.config.dashboard !== "boolean" && adminizer.config.dashboard.autoloadWidgetsPath) {
        try {
            const files = fs.readdirSync(adminizer.config.dashboard.autoloadWidgetsPath);

            const jsFiles = files.filter(file => file.endsWith('.js') && !file.endsWith('.es.js'));

            for (const file of jsFiles) {
                const filePath = path.join(process.cwd(), adminizer.config.dashboard.autoloadWidgetsPath, file);
                try {
                    const _import = await import(pathToFileURL(filePath).href);
                    if (_import.default) {
                        const ImportedClass = _import.default;
                        const instance = new ImportedClass();
                        adminizer.widgetHandler.add(instance);
                    }
                } catch (error) {
                    Adminizer.log.error(`Error when connecting and creating an instance of a class from a file ${filePath}:`, error);
                }
            }
        } catch (err) {
            Adminizer.log.error('Error reading folder:', err);
        }
    }
}
