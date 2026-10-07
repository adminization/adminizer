import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {viteExternalsPlugin} from "vite-plugin-externals";

// One entry per run: CONTEXT_ENTRY=SupportLayout vite build --config ...
const entry = process.env.CONTEXT_ENTRY || 'ContextDemoPage';

const externals: Record<string, string> = {
    react: 'React',
    'react-dom': 'ReactDOM',
    '@inertiajs/react': 'InertiajsReact',
    '@/components/ui/card': 'UIComponents',
    '@/components/ui/sidebar': 'UIComponents',
    // Stock shell parts, published by the admin layout.
    '@/shell': 'AdminizerShell',
};

export default defineConfig({
    define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    },
    plugins: [
        react(),
        viteExternalsPlugin(externals),
    ],
    build: {
        outDir: path.resolve(import.meta.dirname, ''),
        emptyOutDir: false,
        lib: {
            entry: path.resolve(import.meta.dirname, entry),
            name: entry,
            formats: ['es'],
            fileName: (format) => `${entry}.${format}.js`,
        },
        rollupOptions: {
            external: ['tailwindcss', ...Object.keys(externals).filter((name) => name.startsWith('@/'))],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, '../../../src/assets/js'),
        },
    },
});
