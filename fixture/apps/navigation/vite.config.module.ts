import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import {viteExternalsPlugin} from "vite-plugin-externals";

const uiExternals = {
    react: "React",
    "react-dom": "ReactDOM",
    "lucide-react": "LucideReact",
    sonner: "sonner",
    "@/components/add-form": ["JSComponents", "AddForm"],
    "@/components/add-form.tsx": ["JSComponents", "AddForm"],
    "@/components/ui/avatar": "UIComponents",
    "@/components/ui/badge": "UIComponents",
    "@/components/ui/breadcrumb": "UIComponents",
    "@/components/ui/button": "UIComponents",
    "@/components/ui/calendar": "UIComponents",
    "@/components/ui/card": "UIComponents",
    "@/components/ui/checkbox": "UIComponents",
    "@/components/ui/collapsible": "UIComponents",
    "@/components/ui/command": "UIComponents",
    "@/components/ui/context-menu": "UIComponents",
    "@/components/ui/dialog": "UIComponents",
    "@/components/ui/dialog-stack": "UIComponents",
    "@/components/ui/dropdown-menu": "UIComponents",
    "@/components/ui/input": "UIComponents",
    "@/components/ui/label": "UIComponents",
    "@/components/ui/menubar": "UIComponents",
    "@/components/ui/pagination": "UIComponents",
    "@/components/ui/popover": "UIComponents",
    "@/components/ui/select": "UIComponents",
    "@/components/ui/separator": "UIComponents",
    "@/components/ui/sheet": "UIComponents",
    "@/components/ui/sidebar": "UIComponents",
    "@/components/ui/skeleton": "UIComponents",
    "@/components/ui/slider": "UIComponents",
    "@/components/ui/sonner": "UIComponents",
    "@/components/ui/switch": "UIComponents",
    "@/components/ui/table": "UIComponents",
    "@/components/ui/textarea": "UIComponents",
    "@/components/ui/tooltip": "UIComponents",
    '@/lib/axios-compat': 'axios',
};

export default defineConfig({
    define: {
        "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "production"),
    },
    plugins: [
        react(),
        viteExternalsPlugin(uiExternals),
    ],
    build: {
        outDir: path.resolve(import.meta.dirname, ""),
        emptyOutDir: false,
        lib: {
            entry: path.resolve(import.meta.dirname, "NavigationCatalogTemplates"),
            name: "NavigationCatalogTemplates",
            formats: ["es"],
            fileName: (format) => `NavigationCatalogTemplates.${format}.js`,
        },
        rollupOptions: {
            external: [
                "tailwindcss",
                ...Object.keys(uiExternals),
            ],
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(import.meta.dirname, "../../../src/assets/js"),
        },
    },
});
