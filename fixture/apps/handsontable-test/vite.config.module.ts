import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import {viteExternalsPlugin} from "vite-plugin-externals";

export default defineConfig({
    define: {
        "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "production"),
    },
    plugins: [
        react(),
        viteExternalsPlugin({
            react: "React",
            "react-dom": "ReactDOM",
            "@/js-components/handsontable": ["JSComponents", "HandsonTable"],
        }),
    ],
    build: {
        outDir: path.resolve(import.meta.dirname, ""),
        emptyOutDir: false,
        lib: {
            entry: path.resolve(import.meta.dirname, "HandsontableTest"),
            name: "HandsontableTest",
            formats: ["es"],
            fileName: (format) => `HandsontableTest.${format}.js`,
        },
        rollupOptions: {
            external: [
                "@/js-components/handsontable",
            ],
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(import.meta.dirname, "../../../src/assets/js"),
        },
    },
});
