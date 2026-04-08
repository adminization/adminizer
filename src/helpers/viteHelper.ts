import path from "path";
import fs from "fs";
import chalk from "chalk";
import { isAdminizerViteDevMode } from "./runtimeMode";

export function viteRender(routePrefix: string, assetName: string): string {
    const isViteDev = isAdminizerViteDevMode();
    if (isViteDev) {
        return `/${assetName}`
    } else {
        const manifestPath = path.resolve(import.meta.dirname, '../assets/build/manifest.json');
        if (!fs.existsSync(manifestPath)) {
            console.log(chalk.yellow('[vite]: Warning: manifest.json not found in dist folder! Please run "npm run build" first.'));
            return ''
        }
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        return `${routePrefix}/assets/build/${manifest[assetName]?.file}`;
    }
}
