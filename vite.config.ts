import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
      },
    },
    server: {
      port: Number(env.VITE_PORT) || 16750,
      host: "0.0.0.0",
      proxy: {
        "/api-dev": {
          target: env.VITE_API_URL || "http://localhost:36750",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-dev/, "/api"),
        },
        "/ws": {
          target: env.VITE_WS_URL || "ws://localhost:36750",
          ws: true,
          changeOrigin: true,
        },
      },
    },
  };
});