// Builds the extension into build/. Pass --watch to rebuild on changes, and
// --target=firefox to build the Firefox variant into build-firefox/ instead.
//
// Each piece needs a different output shape, hence several Vite builds:
//   options.html            regular page
//   background.js           service worker
//   content/bridge.js       isolated-world content script (classic script)
//   content/main.js         page-world content script (classic script)
//   editor/editor.{js,css}  Monaco + wikidot support, an ES module the page imports on demand
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const watch = process.argv.includes('--watch')
const firefox = process.argv.includes('--target=firefox')
const outDir = resolve(root, firefox ? 'build-firefox' : 'build')

const base = (overrides) => ({
  root,
  configFile: false,
  logLevel: 'warn',
  publicDir: false,
  base: './',
  define: { 'process.env.NODE_ENV': '"production"' },
  ...overrides,
  build: {
    outDir,
    emptyOutDir: false,
    watch: watch ? {} : null,
    reportCompressedSize: false,
    ...overrides.build,
  },
})

const script = (entry, fileName) =>
  base({
    build: {
      lib: {
        entry: resolve(root, entry),
        formats: ['iife'],
        name: 'wikidotMonaco',
        fileName: () => fileName,
      },
    },
  })

await rm(outDir, { recursive: true, force: true })
await mkdir(outDir, { recursive: true })

const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
const manifest = JSON.parse(await readFile(resolve(root, 'src/manifest.json'), 'utf8'))
manifest.version = pkg.version
if (firefox) toFirefox(manifest)
await writeFile(resolve(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2))

await Promise.all([
  build(
    base({
      publicDir: resolve(root, 'public'),
      build: { rollupOptions: { input: resolve(root, 'options.html') } },
    }),
  ),
  build(script('src/background.ts', 'background.js')),
  build(script('src/content/bridge.ts', 'content/bridge.js')),
  build(script('src/content/main.ts', 'content/main.js')),
  build(
    base({
      build: {
        chunkSizeWarningLimit: 8192,
        rollupOptions: {
          input: resolve(root, 'src/editor/index.ts'),
          preserveEntrySignatures: 'exports-only',
          output: {
            entryFileNames: 'editor/editor.js',
            inlineDynamicImports: true,
            assetFileNames: (asset) =>
              asset.name?.endsWith('.css') ? 'editor/editor.css' : 'editor/[name][extname]',
          },
        },
      },
    }),
  ),
])

if (!watch) console.log(`Built extension into ${outDir}`)

// Firefox MV3 has no background service worker, and needs a gecko ID to sign and
// 128+ for MAIN-world content scripts.
function toFirefox(manifest) {
  delete manifest.minimum_chrome_version
  manifest.background = { scripts: [manifest.background.service_worker] }
  manifest.browser_specific_settings = {
    gecko: {
      id: 'wikidot-monaco-editor@ect.fyi',
      strict_min_version: '128.0',
      data_collection_permissions: { required: ['none'] },
    },
  }
}
