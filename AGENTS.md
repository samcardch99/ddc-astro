## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## This project

Read `README.md` first — it explains why the port exists and which toolchain
differences (GSAP 3.15 `SplitText`, Tailwind v4 `scale`/`translate` properties,
Tailwind v4 breakpoint ordering) needed explicit handling.

Rules of the house:

- **HTML first.** Anything a visitor needs to read or navigate belongs in the
  server-rendered markup. JavaScript enhances; it never renders content.
  `tests/e2e/html-first.spec.ts` enforces this.
- **Match the original's motion.** Durations, staggers, eases and ScrollTrigger
  start values come from `ddc-redesign`. If you change one, change the matching
  expectation in `tests/e2e/animations.spec.ts` too.
- **Keep logic out of the DOM layer.** Pure functions live in `src/lib/` and are
  unit-tested; `src/scripts/modules/` only wires them to elements.
- Run `npm run check && npm test` before pushing.
