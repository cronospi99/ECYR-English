import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const IELTS_CONFIG = 'apps/ielts/supabase-config.js';

/**
 * The embedded IELTS Simulator reads its Supabase project from a static
 * `supabase-config.js`. When VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are
 * set, this plugin writes that file from the same values (dev + build), so the
 * platform and the simulator always share one project — and one sign-in.
 */
function ieltsSupabaseConfig(env: Record<string, string>): Plugin {
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY;
  const active = Boolean(url && key && url !== 'off' && key !== 'off');
  const file = `// Generated at build time from VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.\nwindow.SUPABASE_CONFIG = ${JSON.stringify({ url, anonKey: key }, null, 2)};\n`;
  let outDir = 'dist';
  return {
    name: 'ielts-supabase-config',
    configResolved(c) {
      outDir = path.resolve(c.root, c.build.outDir);
    },
    configureServer(server) {
      if (!active) return;
      server.middlewares.use(`/${IELTS_CONFIG}`, (_req, res) => {
        res.setHeader('Content-Type', 'application/javascript');
        res.end(file);
      });
    },
    closeBundle() {
      if (!active) return;
      const target = path.join(outDir, IELTS_CONFIG);
      if (fs.existsSync(path.dirname(target))) fs.writeFileSync(target, file);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react(), tailwindcss(), ieltsSupabaseConfig(env)],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 900,
    },
  };
});
