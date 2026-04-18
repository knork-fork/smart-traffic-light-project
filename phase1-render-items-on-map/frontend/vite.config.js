import { defineConfig } from 'vite'
import { resolve } from 'path'

function watchMapDir() {
  return {
    name: 'watch-map-dir',
    configureServer(server) {
      server.watcher.add(resolve(__dirname, '../map'))
    },
    handleHotUpdate({ file, server }) {
      if (file.startsWith(resolve(__dirname, '../map'))) {
        server.ws.send({ type: 'full-reload' })
        return []
      }
    },
  }
}

export default defineConfig({
  publicDir: '../map',
  plugins: [watchMapDir()],
  server: {
    port: 20050,
    host: '0.0.0.0'
  }
})
