import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import {viteExternalsPlugin} from "vite-plugin-externals";

export default defineConfig({
    plugins: [
        react(),
        viteExternalsPlugin({
            react: "React",
            "react-dom": "ReactDOM",
            "@/components/ui/card": "UIComponents",
        }),
    ],
    build: {
        outDir: path.resolve(import.meta.dirname, ""),
        emptyOutDir: false,
        lib: {
            entry: path.resolve(import.meta.dirname, "RecordScopeTest"),
            name: "RecordScopeTest",
            formats: ["es"],
            fileName: (format) => `RecordScopeTest.${format}.js`,
        },
        rollupOptions: {
            external: ["@/components/ui/card"],
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(import.meta.dirname, "../../../src/assets/js"),
        },
    },
});
