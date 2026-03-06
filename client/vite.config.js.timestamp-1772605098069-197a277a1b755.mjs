// vite.config.js
import { defineConfig } from "file:///D:/CIETM-2026/client/node_modules/vite/dist/node/index.js";
import react from "file:///D:/CIETM-2026/client/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwindcss from "file:///D:/CIETM-2026/client/node_modules/@tailwindcss/vite/dist/index.mjs";
var vite_config_default = defineConfig({
  base: "/",
  plugins: [
    tailwindcss(),
    react()
  ],
  build: {
    outDir: "dist",
    minify: "esbuild",
    sourcemap: false
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxDSUVUTS0yMDI2XFxcXGNsaWVudFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRDpcXFxcQ0lFVE0tMjAyNlxcXFxjbGllbnRcXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0Q6L0NJRVRNLTIwMjYvY2xpZW50L3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xyXG5pbXBvcnQgdGFpbHdpbmRjc3MgZnJvbSAnQHRhaWx3aW5kY3NzL3ZpdGUnXHJcblxyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICAgIGJhc2U6ICcvJyxcclxuICAgIHBsdWdpbnM6IFt0YWlsd2luZGNzcygpLFxyXG4gICAgcmVhY3QoKV0sXHJcbiAgICBidWlsZDoge1xyXG4gICAgICAgIG91dERpcjogJ2Rpc3QnLFxyXG4gICAgICAgIG1pbmlmeTogJ2VzYnVpbGQnLFxyXG4gICAgICAgIHNvdXJjZW1hcDogZmFsc2VcclxuICAgIH0sXHJcbiAgICBzZXJ2ZXI6IHtcclxuICAgICAgICBob3N0OiB0cnVlLFxyXG4gICAgICAgIHBvcnQ6IDUxNzMsXHJcbiAgICAgICAgcHJveHk6IHtcclxuICAgICAgICAgICAgJy9hcGknOiB7XHJcbiAgICAgICAgICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjUwMDAnLFxyXG4gICAgICAgICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIH1cclxuICAgIH1cclxufSlcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFvUCxTQUFTLG9CQUFvQjtBQUNqUixPQUFPLFdBQVc7QUFDbEIsT0FBTyxpQkFBaUI7QUFHeEIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDeEIsTUFBTTtBQUFBLEVBQ04sU0FBUztBQUFBLElBQUMsWUFBWTtBQUFBLElBQ3RCLE1BQU07QUFBQSxFQUFDO0FBQUEsRUFDUCxPQUFPO0FBQUEsSUFDSCxRQUFRO0FBQUEsSUFDUixRQUFRO0FBQUEsSUFDUixXQUFXO0FBQUEsRUFDZjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ0osTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sT0FBTztBQUFBLE1BQ0gsUUFBUTtBQUFBLFFBQ0osUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLE1BQ2xCO0FBQUEsSUFDSjtBQUFBLEVBQ0o7QUFDSixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
