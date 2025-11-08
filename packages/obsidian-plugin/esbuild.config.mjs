import esbuild from 'esbuild';

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
  external: ['obsidian'],
  treeShaking: true,
  loader: {
    ".node": "file",
  },
  outdir: isProd ? "out" : "out/test-vault/.obsidian/plugins/event-modeling-obsidian-plugin/",  // Output to plugin dir for dev; use a build dir for prod
  // outdir: "out"
};

async function run() {
  if (isWatch) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
    console.log('watching for changes...');
  } else {
    await esbuild.build(options);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
