import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Opt-in prerendering: `PRERENDER=1 vite build` produces static HTML
// snapshots for the routes below so Googlebot (and other crawlers)
// see full markup on first load instead of a JS shell. The default
// `vite build` keeps working exactly as before.
const PRERENDER_ROUTES = [
  "/",
  "/surrey",
  "/langley",
  "/abbotsford",
  "/about",
  "/contact",
  "/protection",
  "/add-ons",
  "/compare",
  "/blog",
  "/blog/car-rental-surrey-guide",
  "/blog/daily-vs-weekly-car-rental-surrey-bc",
  "/blog/affordable-car-rental-surrey-langley-abbotsford-bc",
  "/blog/icbc-car-rental-insurance-bc",
  "/blog/car-rental-tips-new-drivers-bc",
  "/blog/best-road-trips-from-surrey-bc",
  "/blog/c2c-vs-turo-vs-enterprise-surrey",
];

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  const shouldPrerender = process.env.PRERENDER === "1" && mode !== "development";
  const prerenderPlugin = shouldPrerender
    ? await (async () => {
        const [{ default: prerender }, { default: PuppeteerRenderer }] = await Promise.all([
          import("@prerenderer/rollup-plugin"),
          import("@prerenderer/renderer-puppeteer"),
        ]);
        return prerender({
          routes: PRERENDER_ROUTES,
          renderer: new PuppeteerRenderer({
            renderAfterTime: 4000,
            headless: true,
          }),
        });
      })()
    : null;

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      prerenderPlugin,
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
