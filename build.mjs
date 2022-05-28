import esbuild from "esbuild"
import { argv, exit } from "node:process"


const mode = argv[0]
if(mode in ["build","dev",""]) {
  console.log(mode+"is not a valid mode")
  exit()
}

const dev = mode === "dev"
await esbuild.build({
  entryPoints: ["./src/index.js"],
  outdir: "dist",
  minify: !dev,
  bundle: true,
  loader: {
    ".fs": "text",
    ".vs": "text",
  },
  target: "esnext",
  platform: "node",
})