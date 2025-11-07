# Event Modeling Layout Obsidian Plugin

This plugin renders Event Modeling diagrams from `evml` code blocks inside Obsidian notes using the shared `event-modeling-layout` package.

## Development

```sh
pnpm -C packages/obsidian-plugin install
pnpm -C packages/obsidian-plugin build
```

The build command bundles `src/main.ts` into `main.js` for Obsidian. During development, use `pnpm -C packages/obsidian-plugin dev` to rebuild on changes.

## Usage

Insert a fenced code block tagged with `evml`:

````
```evml
eventmodeling

...your model...
```
````

The plugin converts it to an SVG diagram using the layout engine.
