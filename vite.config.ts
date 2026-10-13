import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  build: {
    // Split heavy, stable dependencies into their own chunks so they cache
    // independently and don't bloat the per-route code-split chunks.
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Rollup 5 accepts a function here (rather than the legacy module map).
          // Keep the same stable cache boundaries by classifying dependency paths.
          if (/node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/.test(id)) {
            return "react-vendor";
          }
          if (id.includes("node_modules/recharts/")) return "charts";
          if (id.includes("node_modules/qrcode.react/")) return "qr";
          if (id.includes("node_modules/crypto-js/")) return "crypto";
          if (id.includes("node_modules/lucide-react/")) return "icons";
        },
      },
    },
  },
});
