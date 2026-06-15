import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import {viteExternalsPlugin} from "vite-plugin-externals";
import path from "path";

export default defineConfig({
    define: {
        "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "production"),
    },
    plugins: [
        react(),
        viteExternalsPlugin({
            react: "React",
            "react-dom": "ReactDOM",
        }),
    ],
    build: {
        outDir: import.meta.dirname,
        emptyOutDir: false,
        lib: {
            entry: path.resolve(import.meta.dirname, "react-quill-editor.tsx"),
            name: "ReactQuillEditor",
            formats: ["es"],
            fileName: (format) => `react-quill-editor.${format}.js`,
            cssFileName: "react-quill-editor",
        },
    },
});
