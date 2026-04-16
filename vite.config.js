import { defineConfig } from 'vite'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

function artifactsPlugin() {
  const virtualId = 'virtual:artifacts'
  const resolvedId = '\0' + virtualId

  return {
    name: 'vite-plugin-artifacts',
    resolveId(id) {
      if (id === virtualId) return resolvedId
    },
    load(id) {
      if (id === resolvedId) {
        const txt = readFileSync(resolve(__dirname, 'src/assets/artifacts.txt'), 'utf-8')
        const artifacts = txt.split(/\n\n+/).filter(a => a.trim() !== '')
        return `export default ${JSON.stringify(artifacts)};`
      }
    },
  }
}

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
  },
  plugins: [artifactsPlugin()],
})

