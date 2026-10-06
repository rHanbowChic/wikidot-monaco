// Packs build/ into package/<name>-<version>.crx.
//
// The signing key determines the extension ID, so every release must reuse it. It lives
// outside the project (default ~/Documents/wikidot-monaco/key.pem, override with CRX_KEY)
// and is created on first run.
import crx3 from 'crx3'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

const manifest = JSON.parse(readFileSync('build/manifest.json', 'utf8'))
const keyPath = process.env.CRX_KEY || join(homedir(), 'Documents', 'wikidot-monaco', 'key.pem')
const crxPath = `package/${manifest.name.replaceAll(' ', '-')}-${manifest.version}.crx`
const newKey = !existsSync(keyPath)

mkdirSync(dirname(keyPath), { recursive: true })
mkdirSync('package', { recursive: true })
await crx3(['build'], { keyPath, crxPath })

console.log(`${newKey ? 'Created' : 'Signed with'} private key ${keyPath}`)
console.log(`Created ${crxPath}`)
