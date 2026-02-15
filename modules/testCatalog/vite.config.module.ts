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
        }),
    ],
    build: {
        outDir: path.resolve(import.meta.dirname, ''),
        emptyOutDir: false,
        lib: {
            // Specifying multiple entry points
            entry: {
                catalogAction: path.resolve(import.meta.dirname, 'action.tsx'),
                Group: path.resolve(import.meta.dirname, 'group.tsx'),
                // More components can be added
            },
            // name is no longer needed, since each component will have its own name
            formats: ['es'],
            fileName: (format, entryName) => `${entryName}.${format}.js`,
        },
        rollupOptions: {
            external: [
                'tailwindcss',
            ],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, '../../src/assets/js'),
        },
    },
});