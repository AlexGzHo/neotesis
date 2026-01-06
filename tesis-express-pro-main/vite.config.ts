import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";


// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    {
      name: "inline-css",
      transformIndexHtml(html, { bundle }) {
        if (!bundle) return html;
        const cssFiles = Object.keys(bundle).filter((name) => name.endsWith(".css"));
        let styleTags = "";
        for (const name of cssFiles) {
          const chunk = bundle[name];
          if (chunk.type === "asset") {
            styleTags += `<style>${chunk.source}</style>`;
            delete bundle[name]; // Remove the external file from output
          }
        }
        // Remove existing link tags that Vite might have injected
        const cleanHtml = html.replace(/<link rel="stylesheet"[^>]*>/g, "");
        return cleanHtml.replace("</head>", `${styleTags}</head>`);
      },
    }
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          lucide: ["lucide-react"],
          ui: [
            "@radix-ui/react-accordion",
            "@radix-ui/react-slot",
            "@radix-ui/react-toast",
          ],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
}));
