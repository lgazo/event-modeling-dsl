# Event Modeling Layout Obsidian Plugin

This plugin renders Event Modeling diagrams from `evml` code blocks inside Obsidian notes using the shared `event-modeling-layout` package.

## Development

```sh
pnpm -F event-modeling-obsidian-plugin install
pnpm -F event-modeling-obsidian-plugin run dev
```

The build command bundles necessary files into `out` folder. In development you get full test vault with the plugin configured.

## Usage

Insert a fenced code block tagged with `evml`:

````
```evml
eventmodeling

...your model...
```
````

The plugin converts it to an SVG diagram using the layout engine.

## Production build

```
pnpm -F event-modeling-obsidian-plugin run clean
pnpm -F event-modeling-obsidian-plugin run build
```

The `out` directory contains all the necessary plugin files. You can sideload it by copying it to any vault's `.obsidian/plugins/event-modeling-obsidian-plugin` directory.
