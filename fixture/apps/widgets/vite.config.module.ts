import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {viteExternalsPlugin} from "vite-plugin-externals";

export default defineConfig({
    define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    },
    plugins: [
        react(),
        viteExternalsPlugin({
            react: 'React',
            'react-dom': 'ReactDOM',
            '@/components/ui/button': 'UIComponents',
        }),
    ],
    build: {
        outDir: path.resolve(import.meta.dirname, ''),
        emptyOutDir: false,
        lib: {
            entry: path.resolve(import.meta.dirname, 'CustomWidget'),
            name: 'CustomWidget',
            formats: ['es'],
            fileName: (format) => `CustomWidget.${format}.js`,
        },
        rollupOptions: {
            external: [
                'tailwindcss',
                '@/components/ui/button',
            ],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, '../../../src/assets/js'),
        },
    },
});
