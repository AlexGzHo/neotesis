import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@features': path.resolve(__dirname, './src/features'),
            '@components': path.resolve(__dirname, './src/components'),
            '@hooks': path.resolve(__dirname, './src/hooks'),
            '@services': path.resolve(__dirname, './src/services'),
            '@utils': path.resolve(__dirname, './src/utils'),
            '@styles': path.resolve(__dirname, './src/styles'),
            '@pages': path.resolve(__dirname, './src/pages'),
        },
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8080',
                changeOrigin: true,
                secure: false,
            }
        }
    },
    build: {
        outDir: 'dist',
        target: 'esnext', // Required for pdfjs-dist top-level await
        rollupOptions: {
            output: {
                manualChunks: {
                    pdfjs: ['pdfjs-dist'],
                    vendor: ['react', 'react-dom'],
                },
            },
        },
    },
    esbuild: {
        supported: {
            'top-level-await': true
        },
    },
    optimizeDeps: {
        include: ['pdfjs-dist'],
        exclude: ['react-pdf-main', 'docs'],
    },
})
