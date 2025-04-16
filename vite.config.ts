import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs';

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import basicSsl from '@vitejs/plugin-basic-ssl'



// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const allowedHosts = env.VUE_APP_ALLOWED_HOSTS ? env.VUE_APP_ALLOWED_HOSTS.split(',') : [];

  return {
    plugins: [
      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag) => tag.startsWith("gradio-"),
          },
        },
      }),
      vueJsx(),
      vueDevTools(),
      basicSsl({
        name: 'SandboxWebUICert',
        /** custom trust domains */
        domains: ['textgen.net.ecm', 'engine.updatemirror.cc'],
        certDir: './.devServer/cert',
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
    server: {
      host: "0.0.0.0",
      allowedHosts: allowedHosts,
      https: false,
      port: 8080,
      strictPort: true,
    },
    preview: {
      allowedHosts: allowedHosts
    },
    base: env.VUE_APP_PATH_SUFFIX ? ('/' + env.VUE_APP_PATH_SUFFIX + '/') : undefined,
  }
})
