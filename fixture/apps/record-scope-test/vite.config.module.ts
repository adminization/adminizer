import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import {viteExternalsPlugin} from "vite-plugin-externals";

export default defineConfig({
    // The bundled react/jsx-runtime shim reads `process.env.NODE_ENV`, which does not
    // exist in the browser — without this the module throws before it can render.
    define: {
        "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "production"),
    },
    plugins: [
        react(),
        viteExternalsPlugin({
            react: "React",
            "react-dom": "ReactDOM",
            "@/components/ui/badge": "UIComponents",
            "@/components/ui/card": "UIComponents",
            "@/components/ui/table": "UIComponents",
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
            external: [
                "@/components/ui/badge",
                "@/components/ui/card",
                "@/components/ui/table",
            ],
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(import.meta.dirname, "../../../src/assets/js"),
        },
    },
});
