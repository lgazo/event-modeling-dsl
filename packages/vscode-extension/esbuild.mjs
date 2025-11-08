//@ts-check
import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');
const minify = process.argv.includes('--minify');

function getTime() {
    const date = new Date();
    return `[${`${padZeroes(date.getHours())}:${padZeroes(date.getMinutes())}:${padZeroes(date.getSeconds())}`}] `;
}

function padZeroes(i) {
    return i.toString().padStart(2, '0');
}

const builds = [
    {
        label: 'Extension',
        options: {
            entryPoints: ['src/extension/main.ts', 'src/language/main.ts'],
            outdir: 'out',
            bundle: true,
            target: 'ES2017',
            format: 'cjs',
            outExtension: {
                '.js': '.cjs'
            },
            loader: { '.ts': 'ts' },
            external: ['vscode'],
            platform: 'node',
            sourcemap: !minify,
            minify
        }
    },
    {
        label: 'Webview',
        options: {
            entryPoints: ['src/extension/webview/livePreview.ts'],
            outdir: 'out/webview',
            bundle: true,
            target: 'ES2020',
            format: 'iife',
            loader: { '.ts': 'ts' },
            platform: 'browser',
            sourcemap: !minify,
            minify
        }
    }
];

const contexts = [];

for (const build of builds) {
    const plugins = [{
        name: `watch-plugin-${build.label.toLowerCase()}`,
        setup(pluginBuild) {
            pluginBuild.onEnd(output => {
                if (output.errors.length === 0) {
                    const suffix = watch ? '(watch) ' : '';
                    console.log(`${getTime()}${build.label} build ${suffix}succeeded`);
                }
            });
        },
    }];

    const context = await esbuild.context({
        ...build.options,
        plugins
    });
    contexts.push({ label: build.label, context });
}

if (watch) {
    await Promise.all(contexts.map(item => item.context.watch()));
} else {
    for (const { context } of contexts) {
        await context.rebuild();
        context.dispose();
    }
}
