import fs from 'node:fs'
const entries = fs
  .readdirSync('public/design')
  .filter((name) => name.endsWith('.svg'))
  .map((name) => {
    const file = fs.readFileSync(`public/design/${name}`, 'utf8')
    const root = file.match(/<svg[^>]+>/)?.[0] ?? ''
    const width = Number(root.match(/\bwidth="([\d.]+)"/)?.[1])
    const height = Number(root.match(/\bheight="([\d.]+)"/)?.[1])
    if (!width || !height || !file.length) throw new Error(`Invalid asset: ${name}`)
    return [name.slice(0, -4), { width, height }]
  })
fs.writeFileSync(
  'src/data/asset-dimensions.json',
  JSON.stringify(Object.fromEntries(entries), null, 2) + '\n',
)
console.log(`${entries.length} local SVG assets verified; intrinsic dimensions recorded.`)
