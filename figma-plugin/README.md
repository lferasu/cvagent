# CV Tailor Studio Figma Plugin

This plugin generates a premium guided SaaS UI for `CV Tailor Studio` with reusable components and both desktop/mobile layouts.

## Files
- `manifest.json`
- `ui.html`
- `code.ts` (source)
- `code.js` (runnable entry used by manifest)
- `UX-SPEC.md`

## Run in Figma
1. Open Figma desktop app.
2. Go to `Plugins -> Development -> Import plugin from manifest...`.
3. Select `figma-plugin/manifest.json`.
4. Run plugin from `Plugins -> Development -> CV Tailor Studio Generator`.
5. Click `Generate Design` in plugin UI.

## Theme Tokens
Update design tokens in `code.ts` at the top:
- `TOKENS.colors`
- `TOKENS.spacing`
- `TOKENS.radius`
- `TOKENS.typography`

Then copy changes to `code.js` (or transpile automatically) before running.

## Extend with Additional Templates
1. Add new template metadata in `createDesktopFrame` inside `createTemplateInstances(...)` input array.
2. Add equivalent mobile tile label in `createMobileFrame` template list.
3. If needed, add more tab instances in desktop/mobile results tab rows.

## Notes
- The plugin uses Auto Layout on all major containers/components.
- Results use tabs instead of parallel cards to reduce cognitive load and improve mobile readability.
