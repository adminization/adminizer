import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import {viteExternalsPlugin} from "vite-plugin-externals";

/**
 * The assistant panel ships as its own ES module bundle, loaded on demand when
 * the panel is first opened: assistant-ui and the markdown stack are heavy and
 * have no business in the main app bundle.
 *
 * React, lucide and the shadcn components come from the page at runtime
 * (window.React / window.LucideReact / window.UIComponents), so they are
 * externalized. The Tailwind utilities the vendored assistant-ui components
 * need are compiled into globals.css and injected by the entry (?inline).
 */
export default defineConfig({
    define: {
        "process.env": {},
        "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "production"),
    },
    plugins: [
        react(),
        tailwindcss(),
        viteExternalsPlugin({
            "react-dom": "ReactDOM",
            "lucide-react": "LucideReact",
            "@/components/ui/avatar": "UIComponents",
            "@/components/ui/badge": "UIComponents",
            "@/components/ui/button": "UIComponents",
            "@/components/ui/collapsible": "UIComponents",
            "@/components/ui/dialog": "UIComponents",
            "@/components/ui/tooltip": "UIComponents",
        }),
    ],
    build: {
        outDir: path.resolve(import.meta.dirname, "dist/assets"),
        emptyOutDir: false,
        lib: {
            entry: {
                agent: path.resolve(import.meta.dirname, "src/assets/js/ai-assistant/agent/index.tsx"),
            },
            formats: ["es"],
        },
        rollupOptions: {
            output: {
                entryFileNames: "ai-assistant/[name].es.js",
                chunkFileNames: "ai-assistant/chunks/[name]-[hash].js",
                assetFileNames: "ai-assistant/[name][extname]",
            },
        },
    },
    resolve: {
        extensions: [".js", ".ts", ".tsx", ".jsx"],
        alias: {
            // React is a window global. ESM facades with real named exports are
            // required because some deps re-export react (`export * from "react"`),
            // which vite-plugin-externals cannot express; the jsx-runtime shim
            // emulates the automatic JSX runtime via createElement.
            "react/jsx-runtime": path.resolve(import.meta.dirname, "src/assets/js/ai-assistant/agent/jsx-runtime-shim.js"),
            "react/jsx-dev-runtime": path.resolve(import.meta.dirname, "src/assets/js/ai-assistant/agent/jsx-runtime-shim.js"),
            "react-dom/client": path.resolve(import.meta.dirname, "src/assets/js/ai-assistant/agent/react-dom-global-shim.js"),
            react: path.resolve(import.meta.dirname, "src/assets/js/ai-assistant/agent/react-global-shim.js"),
            "@": path.resolve(import.meta.dirname, "./src/assets/js"),
        },
    },
});
