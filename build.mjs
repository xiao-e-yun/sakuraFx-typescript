import esbuild from "esbuild"
import { argv, exit } from "node:process"


const mode = argv[2].trim()
console.log("run in", mode)
if(!["build","dev",""].includes(mode)) {
  console.log(mode+" is not a valid mode")
  exit()
}

const dev = mode === "dev"
await esbuild.build({
  entryPoints: ["./src/index.js"],
  outdir: "dist",
  minify: !dev,
  watch: dev,
  bundle: true,
  loader: {
    ".fs": "text",
    ".vs": "text",
  },
  target: "esnext",
  platform: "neutral",
})