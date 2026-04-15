import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

function apiOriginForPreconnect(mode: string) {
  const env = loadEnv(mode, path.resolve(__dirname), "");
  const raw = (env.VITE_API_URL || "").trim().replace(/\/$/, "");
  if (!raw) return "";
  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    {
      name: "inject-api-preconnect",
      transformIndexHtml: {
        order: "pre",
        handler(html) {
          const origin = apiOriginForPreconnect(mode);
          if (!origin) return html;
          const injection = `
    <link rel="dns-prefetch" href="${origin}" />
    <link rel="preconnect" href="${origin}" crossorigin />`;
          return html.replace(/<meta name="viewport"[^>]*\/>/, (m) => `${m}${injection}`);
        },
      },
    },
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
