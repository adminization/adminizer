import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import {viteExternalsPlugin} from "vite-plugin-externals";
import packageJson from "./package.json";

export default defineConfig({
    define: {
        "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "production"),
        "__APP_VERSION__": JSON.stringify(packageJson.version),
    },
    plugins: [
        react(),
        viteExternalsPlugin({
            react: "React",
            "react-dom": "ReactDOM",
        }),
    ],
    build: {
        outDir: path.resolve(import.meta.dirname, "dist/assets"),
        emptyOutDir: false,
        cssCodeSplit: true,
        lib: {
            entry: {
                ckeditor: path.resolve(import.meta.dirname, "src/assets/js/controls/ckeditor.tsx"),
                "toast-ui": path.resolve(import.meta.dirname, "src/assets/js/controls/toast-ui.tsx"),
                handsontable: path.resolve(import.meta.dirname, "src/assets/js/controls/handsontable.tsx"),
                jsoneditor: path.resolve(import.meta.dirname, "src/assets/js/controls/jsoneditor.tsx"),
                monaco: path.resolve(import.meta.dirname, "src/assets/js/controls/monaco.tsx"),
                leaflet: path.resolve(import.meta.dirname, "src/assets/js/controls/leaflet.tsx"),
            },
            formats: ["es"],
        },
        rollupOptions: {
            output: {
                entryFileNames: "controls/[name].es.js",
                chunkFileNames: "controls/chunks/[name]-[hash].js",
                assetFileNames: "controls/[name][extname]",
            },
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(import.meta.dirname, "./src/assets/js"),
        },
    },
});
