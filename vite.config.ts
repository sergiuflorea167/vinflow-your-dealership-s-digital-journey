import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          const normalizedId = id.replace(/\\/g, "/");
          if (normalizedId.includes("/lucide-react/")) return "icons-vendor";
          if (
            normalizedId.includes("/react/") ||
            normalizedId.includes("/react-dom/") ||
            normalizedId.includes("/react-router-dom/") ||
            normalizedId.includes("/scheduler/")
          ) {
            return "react-vendor";
          }
          if (id.includes("@supabase")) return "supabase-vendor";
          if (id.includes("@radix-ui") || id.includes("cmdk") || id.includes("vaul")) return "ui-vendor";
          if (id.includes("recharts")) return "charts-vendor";
          if (id.includes("exceljs")) return "excel-vendor";
          if (
            id.includes("jspdf") ||
            id.includes("pdf-lib") ||
            id.includes("html2canvas") ||
            id.includes("dompurify")
          ) {
            return "pdf-vendor";
          }
          if (id.includes("@tanstack")) return "query-vendor";
        },
      },
    },
  },
}));
