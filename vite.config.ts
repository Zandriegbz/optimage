import path from "path"
import react from "@vitejs/plugin-react-swc"
import { defineConfig } from "vite"
import { nodePolyfills } from 'vite-plugin-node-polyfills' // Import the plugin

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Options:
      // Explicitly exclude the 'os' polyfill as we handle concurrency manually
      // and it might be causing the 'navigator' property error.
      exclude: ['os'],
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true,
      // Keep other globals polyfilled as they might be needed by squoosh or other deps
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})