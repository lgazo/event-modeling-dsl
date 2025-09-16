# Development

In one terminal watch for changes in the grammar file:

```bash
pnpm run langium:watch
```

In the second terminal watch for code changes reflected in Monaco web editor:

```bash
pnpm run dev
```

The editor is available at: http://192.168.100.12:5173/static/monacoExtended.html

# VSCode Extension

In order to use `pnpm` you need to patch `vsce`'s implementation. Replace `npm.js` with the one in the `patch` folder.

Then just run `pnpm run vscode:package`.

# VSCodium Extension

https://github.com/VSCodium/vscodium/blob/master/docs/extensions.md

https://github.com/eclipse/openvsx/wiki/Publishing-Extensions
