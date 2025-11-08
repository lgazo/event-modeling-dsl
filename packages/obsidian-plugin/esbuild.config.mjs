import esbuild from 'esbuild';
import process from "process";
import builtins from "builtin-modules";

const args = process.argv.slice(2);
const isWatch = args.includes('--watch');
const isProd = args.includes('--prod');

const options = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  // outfile: 'main.js',
  // platform: 'browser',
  platform: 'node',
  target: 'es2020',
  format: 'cjs',
  sourcemap: isProd ? false : 'inline',
  minify: isProd,
  treeShaking: true,
  // loader: {
  //   ".node": "file",
  // },
  outdir: isProd ? "out" : "out/test-vault/.obsidian/plugins/event-modeling-obsidian-plugin/",  // Output to plugin dir for dev; use a build dir for prod
  // outdir: "out"
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
    ...builtins],
};

async function run() {
  const ctx = await esbuild.context(options);
  if (isWatch) {
    await ctx.watch();
    console.log('watching for changes...');
  } else {
    await ctx.rebuild();
    process.exit(0);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
