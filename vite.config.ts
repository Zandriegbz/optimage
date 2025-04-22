import path from "path"
import react from "@vitejs/plugin-react-swc"
import { defineConfig } from "vite"
import { nodePolyfills } from 'vite-plugin-node-polyfills' // Import the plugin

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Options (optional):
      // To exclude specific polyfills, add them to this list.
      // exclude: [],
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true,
      // Whether to polyfill specific globals.
      globals: {
        Buffer: true, // Default: true. Ex: Buffer.from('hello')
        global: true, // Default: true. Ex: global.Buffer
        process: true, // Default: true. Ex: process.env.NODE_ENV
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Optional: Optimize @squoosh/lib dependencies if needed, but polyfills plugin should handle most cases.
  // optimizeDeps: {
  //   include: ['@squoosh/lib']
  // }
})