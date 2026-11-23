import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const devHtmlPlugin = () => ({
  name: 'dev-html-transform',
  transformIndexHtml(html, ctx) {
    if (ctx && ctx.server) {
      return html
        .replace(/<link rel="stylesheet"[^>]*assets\/index-[^>]*>/, '')
        .replace(/<link rel="modulepreload"[^>]*>/g, '')
        .replace(/<script type="module"[^>]*assets\/index-[^>]*><\/script>/, '<script type="module" src="/src/main.jsx"></script>');
    }
    return html;
  }
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), devHtmlPlugin()],
  base: './',
  server: {
    port: 3000,
    open: false,
    host: true,
    watch: {
      ignored: ['**/backend/**', '**/models/**', '**/outputs/**']
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          icons: ['lucide-react']
        }
      }
    }
  }
});
