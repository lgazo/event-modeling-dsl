import esbuild from 'esbuild';
import process from 'process';
import builtins from 'builtin-modules';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { watch } from 'fs';

const args = process.argv.slice(2);
const isWatch = args.includes('--watch');
const isProd = args.includes('--prod');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outdir = isProd
  ? path.resolve(__dirname, 'out')
  : path.resolve(
    __dirname,
    'out/test-vault/.obsidian/plugins/event-modeling-obsidian-plugin/',
  );

const staticAssets = [
  {
    source: path.join(__dirname, 'manifest.json'),
    target: 'manifest.json',
  },
  {
    source: path.join(__dirname, 'src', 'styles.css'),
    target: 'styles.css',
  },
];

const devAssets = [
  {
    source: path.join(__dirname, 'test/test-vault/hello.md'),
    target: '../../../../test-vault/hello.md',
  },
  {
    source: path.join(__dirname, 'test/test-vault/.obsidian/app.json'),
    target: '../../../../test-vault/.obsidian/app.json',
  },
  {
    source: path.join(__dirname, 'test/test-vault/.obsidian/community-plugins.json'),
    target: '../../../../test-vault/.obsidian/community-plugins.json',
  },
];

async function copyStaticAssets(destinationRoot) {
  await Promise.all(
    staticAssets.map(async ({ source, target }) => {
      const destination = path.join(destinationRoot, target);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.copyFile(source, destination);
    }),
  );
  if (!isProd) {

    await Promise.all(
      devAssets.map(async ({ source, target }) => {
        const destination = path.join(destinationRoot, target);
        await fs.mkdir(path.dirname(destination), { recursive: true });
        await fs.copyFile(source, destination);
      }),
    );
  }
}

function watchStaticAssets(destinationRoot) {
  const watchers = staticAssets.map(({ source }) =>
    watch(source, () => {
      copyStaticAssets(destinationRoot).catch((err) => {
        console.error('Failed to copy static assets:', err);
      });
    }),
  );

  return () => {
    for (const watcher of watchers) {
      watcher.close();
    }
  };
}

const options = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  platform: 'node',
  target: 'es2020',
  format: 'cjs',
  sourcemap: isProd ? false : 'inline',
  minify: isProd,
  treeShaking: true,
  outdir,
  external: [
    'obsidian',
    'electron',
    '@codemirror/autocomplete',
    '@codemirror/collab',
    '@codemirror/commands',
    '@codemirror/language',
    '@codemirror/lint',
    '@codemirror/search',
    '@codemirror/state',
    '@codemirror/view',
    '@lezer/common',
    '@lezer/highlight',
    '@lezer/lr',
    ...builtins,
  ],
};

async function run() {
  const ctx = await esbuild.context(options);

  const copyAssets = async () => {
    try {
      await copyStaticAssets(outdir);
    } catch (err) {
      console.error('Failed to copy static assets:', err);
    }
  };

  if (isWatch) {
    await copyAssets();
    const stopAssetWatchers = watchStaticAssets(outdir);
    await ctx.watch({
      onRebuild(error) {
        if (error) {
          console.error('watch build failed:', error);
        } else {
          copyAssets();
        }
      },
    });
    console.log('watching for changes...');

    const shutdown = () => {
      stopAssetWatchers();
      ctx.dispose().catch(() => { });
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } else {
    await ctx.rebuild();
    await copyAssets();
    await ctx.dispose();
    process.exit(0);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
