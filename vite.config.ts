import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

/** Serves the Vercel function api/tts.ts during `npm run dev`, so the natural voices work locally too. */
function apiInDev(): Plugin {
  return {
    name: 'ecyr-api-in-dev',
    apply: 'serve',
    configureServer(server) {
      Object.assign(process.env, loadEnv(server.config.mode, process.cwd(), ''));
      server.middlewares.use('/api/tts', async (req, res) => {
        const mod = await server.ssrLoadModule('/api/tts.ts');
        await mod.default(req, res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), apiInDev()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900,
  },
});
