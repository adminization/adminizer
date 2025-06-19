import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { viteExternalsPlugin } from 'vite-plugin-externals'

export default defineConfig({
  plugins: [
    react(),
    viteExternalsPlugin({
      react: 'React',
      'react-dom': 'ReactDOM'
    })
  ],
  build: {
    outDir: path.resolve(__dirname, 'dist/ui'),
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, 'src/assets/js/components/index.ts'),
      name: 'AdminizerUI',
      formats: ['es'],
      fileName: (format) => `index.${format}.js`
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/assets/js')
    }
  }
})
