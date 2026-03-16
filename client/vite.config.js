import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


export default defineConfig({
    base: '/',
    plugins: [tailwindcss(),
    react()],
    build: {
        outDir: 'dist',
        minify: 'esbuild',
        sourcemap: false
    },
    server: {
        host: true,
        port: 5174,
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true,
            },
        }
    }
})
