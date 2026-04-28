import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import packageJson from './package.json';


export default defineConfig({
    define: {
        '__APP_VERSION__': JSON.stringify(packageJson.version),
        '__BUILD_TIME__': JSON.stringify(new Date().toISOString()),
    },
    publicDir: false,
    base: './',
    build: {
        outDir: path.resolve(import.meta.dirname, 'dist/assets'), // Output directory for the build
        assetsDir: '',
        emptyOutDir: true, // Clear the output directory before building
        manifest: 'manifest.json', // Generate manifest.json
        sourcemap: false, // Disable sourcemaps to reduce memory usage
        rollupOptions: {
            input: {
                app: path.resolve(import.meta.dirname, 'src/assets/js/app.tsx'),
            },
            output: {
                entryFileNames: '[name].js',
                assetFileNames: '[name]-[hash][extname]',
                manualChunks: {
                    vendor: ['react', 'react-dom'],
                    monaco: ['@monaco-editor/react'],
                    handsontable: ['@handsontable/react-wrapper', 'handsontable'],
                    jsoneditor: ['vanilla-jsoneditor']
                }
            },
        },
    },
    plugins: [
        react(),
        tailwindcss(),
    ],
    esbuild: {
        jsx: 'automatic',
    },
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, './src/assets/js'),
        },
    },
})
