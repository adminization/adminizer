import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {viteExternalsPlugin} from "vite-plugin-externals";

const uiExternals = {
    react: 'React',
    'lucide-react': 'LucideReact',
    'react-dom': 'ReactDOM',
    '@/components/ui/button': 'UIComponents',
    '@/components/ui/input': 'UIComponents',
    '@/components/ui/label': 'UIComponents',
    '@/lib/axios-compat': 'axios',
};

const entries: Record<string, string> = {
    catalogAction: path.resolve(import.meta.dirname, 'action.tsx'),
    Group: path.resolve(import.meta.dirname, 'group.tsx'),
};

const selectedEntryName = process.env.CATALOG_COMPONENT;
if (selectedEntryName && !entries[selectedEntryName]) {
    throw new Error(`Unknown virtual catalog component "${selectedEntryName}"`);
}

export default defineConfig({
    define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    },
    plugins: [
        react(),
        viteExternalsPlugin(uiExternals),
    ],
    build: {
        outDir: path.resolve(import.meta.dirname, ''),
        emptyOutDir: false,
        lib: {
            entry: selectedEntryName
                ? {[selectedEntryName]: entries[selectedEntryName]}
                : entries,
            formats: ['es'],
            fileName: (format, entryName) => `${entryName}.${format}.js`,
        },
        rollupOptions: {
            external: [
                'tailwindcss',
                ...Object.keys(uiExternals),
            ],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, '../../src/assets/js'),
        },
    },
});
