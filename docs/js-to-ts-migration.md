# JavaScript → TypeScript Migration Guide

How the frontend was converted from JS/JSX to TS/TSX (August 2026), written
as a repeatable playbook so you can run the same migration on any Vite +
React project yourself.

## Why migrate

- **Catch bugs at compile time** — typos in prop names, missing null checks,
  and wrong API shapes fail `tsc` instead of failing in the browser.
- **Self-documenting code** — the shape of an API row or a component's props
  is written down once and enforced everywhere.
- **Better editor experience** — autocomplete, rename-symbol, and
  go-to-definition all work off real types.

## The strategy: bottom-up, one layer per commit

The single most important decision: **convert in dependency order**, so that
TypeScript files only ever import other TypeScript files. The project stays
green (`tsc`, `lint`, `build` all pass) after every commit.

```
1. tooling      (tsconfig, ESLint, vite.config.ts)     ← nothing imports this
2. src/types.ts (shared domain types)
3. src/data + src/lib   (pure modules, no React)
4. src/hooks            (import data/lib)
5. components           (import hooks)      ← site first, then admin
6. pages                (import components)
7. App.tsx, main.tsx, index.html            ← the entry point, last
```

The reverse (top-down) forces `.tsx` files to import `.jsx` files, which
needs `allowJs` and leaves you with untyped islands. Bottom-up never does.

Verify after **every** layer before committing:

```bash
npx tsc -b          # typecheck
npm run lint        # lint
npm run build       # bundle
```

## Step 1 — Tooling

```bash
npm install --save-dev typescript typescript-eslint
```

**tsconfig**: use the same three-file layout as Vite's `react-ts` template —
a root `tsconfig.json` that only holds project references, `tsconfig.app.json`
for `src/` (browser code), and `tsconfig.node.json` for `vite.config.ts`
(node code). Key options in `tsconfig.app.json`:

| Option | Why |
| --- | --- |
| `"strict": true` | The whole point. Start strict; loosening later is easy, tightening later is painful. |
| `"noEmit": true` | Vite (esbuild/rolldown) does the transpiling; `tsc` only typechecks. |
| `"moduleResolution": "bundler"` | Matches how Vite actually resolves imports. |
| `"jsx": "react-jsx"` | The modern JSX transform — no `import React` needed. |
| `"types": ["vite/client"]` | Types for `import.meta.env` and asset imports (`.png`, `.svg`, `.webp`). |
| `"verbatimModuleSyntax": true` | Forces `import type { X }` for type-only imports so bundlers can safely drop them. |
| `"noUnusedLocals"` / `"noUnusedParameters"` | Surfaces dead code during the conversion (prefix a param with `_` to intentionally keep it). |

**`src/vite-env.d.ts`** — declare your env vars so `import.meta.env.VITE_API_URL`
is typed instead of `any`:

```ts
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

**ESLint (flat config)**: add a `**/*.{ts,tsx}` block extending
`tseslint.configs.recommended` alongside the existing JS block. Keep the JS
block during the migration; delete it in the final cleanup commit.
Interesting find: the core `no-unused-vars` rule can't see identifiers used
only in JSX (it flagged `motion` as unused in files using `<motion.div>`),
while `@typescript-eslint/no-unused-vars` handles JSX correctly — converting
the files fixed 11 of our 13 "pre-existing" lint errors for free.

**Build script**: `"build": "tsc -b && vite build"` — this is what makes
Vercel (or any CI) fail the deploy on type errors.

**Renames**: `git mv vite.config.js vite.config.ts` for config files. For
source files, writing the new `.ts(x)` file and `git rm`-ing the old one in
the same commit works too — git detects the rename by content similarity
(our commits show `rename ... (86%)` etc.), so history and `git blame` follow.

## Step 2 — Shared domain types first

Before converting any file, write `src/types.ts` with the core shapes the
whole app passes around (`ScheduleEvent`, `Sponsor`, `TeamMember`,
`GalleryYear`, …). Everything else hangs off these.

Two patterns worth copying:

**1. Model the API boundary explicitly.** The backend speaks snake_case,
the frontend camelCase. Give each its own type and keep the mapper as the
only place that knows both:

```ts
/** Raw row from the Express API. */
interface ScheduleEventRow {
  id: string;
  start_hour: number | string;   // Postgres numeric can arrive as string!
  ...
}
function mapEvent(e: ScheduleEventRow): ScheduleEvent { ... }
```

**2. Extend, don't duplicate.** The admin dashboard stages edits by adding
client-only fields to server rows. Model that with extension, so admin types
stay assignable to the public component props:

```ts
interface AdminEvent extends ScheduleEvent {
  id: string;          // required here (real uuid or "tmp-N")
  _new?: boolean;      // staged-add marker, never sent to the server
}
/** Modal seed — same shape but no id until staged. */
type EventForm = Omit<AdminEvent, "id"> & { id?: string };
```

## Step 3 — Converting files: the recurring recipes

Most of the conversion is mechanical. These are the patterns that came up
over and over:

**Props → interface** (the bread and butter):

```tsx
interface ScheduleGridProps {
  events: ScheduleEvent[];
  minHour: number;
  maxHour: number;
  onEventClick?: (event: ScheduleEvent) => void;   // optional callback
  eventClassName?: (event: ScheduleEvent) => string;
}
export default function ScheduleGrid({ events, ... }: ScheduleGridProps) {
```

**`useState` needs a type argument when the initial value doesn't tell the
whole story:**

```ts
const [error, setError] = useState<Error | null>(null);   // not just null
const [drafts, setDrafts] = useState<AdminEvent[]>([]);   // not never[]
const [height, setHeight] = useState<number | undefined>(undefined);
```

**`useRef` — say what it will hold:**

```ts
const cardRef = useRef<HTMLDivElement>(null);      // DOM element
const frameRef = useRef<number | null>(null);      // rAF handle
const timer: ReturnType<typeof setTimeout>;        // portable timer type
```

**Event handlers** — React events vs. native events are different types:

```ts
function submit(e: React.FormEvent<HTMLFormElement>) {}   // JSX onSubmit
function onMove(e: MouseEvent) {}                          // addEventListener
```

**`catch (err)` is `unknown` in strict mode.** Cast at the use site to keep
behavior identical: `setError((err as Error).message)`.

**Type-predicate filters** — `.filter(Boolean)` doesn't narrow types:

```ts
.filter((c): c is CompanyRow & { sponsor_tier: SponsorTier } => !!c.sponsor_tier)
.filter((el): el is HTMLDivElement => el !== null)
```

**Generic fetch helpers** — make the caller declare what comes back:

```ts
export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T>
// caller:
const rows = await apiGet<ScheduleEventRow[]>("/schedule");
```

**Generic components** — `DragGrid` reorders any item type:

```tsx
function DragGrid<T>({ items, renderItem, ... }: DragGridProps<T>) { ... }
```

**Motion/Framer objects need annotations** — a bare object literal infers
`type: string`, which doesn't satisfy the library's union types:

```ts
import { motion, type Variants, type Transition } from "motion/react";
const itemVariants: Variants = { hidden: {...}, visible: {...} };
const morphSpring: Transition = { type: "spring", stiffness: 500 };
```

**`verbatimModuleSyntax` requires `import type`** for anything that is only
a type: `import type { ScheduleEvent } from "../types";` or inline:
`import { useState, type ReactNode } from "react";`.

**Narrowing doesn't reach into function bodies.** After
`if (!form) return null;` the JSX below is narrowed, but a `function submit()`
defined in the component is analyzed independently — add its own
`if (!form) return;` guard (behavior is identical; nothing can submit while
the modal renders null).

**`src` can't be `null`.** `<img src={a ?? b}>` where `b: string | null`
needs `?? undefined` (or assign to a `const` first and guard on it) because
`src` accepts `string | undefined` but not `null`.

## Step 4 — Behavior-preserving means behavior-preserving

Rule for a refactor commit: the compiled output should do exactly what it
did before. Where TypeScript *forced* a change, we picked the equivalent
form and noted it in the commit message:

- `apiFetch` now merges headers via `new Headers(options.headers)` — handles
  every `HeadersInit` form instead of only plain objects; same result for
  all existing callers.
- `CustomCursor` called hooks after a conditional `return null` (a real
  rules-of-hooks violation). Moved the guard *after* the hooks and into the
  effect — same rendered output on every device, lint error gone.
- Non-null assertions (`p._file!`) were used only where an invariant
  guarantees the value exists (e.g. `_new` photos always carry `_file`) —
  matching the original code, which would also have thrown if that invariant
  broke.

## Step 5 — Final cleanup

Once no `.js`/`.jsx` source remains:

- delete the transitional JS block from `eslint.config.js`
- point `index.html` at `/src/main.tsx`
- full verify: `npx tsc -b && npm run lint && npm run build`, then
  `npm run preview` and click through the site (or at least curl the routes)

## Commit log of this migration

```
chore(frontend): add TypeScript tooling for gradual JS-to-TS migration
refactor(frontend): convert data and lib modules to TypeScript
refactor(frontend): convert data-fetching hooks to TypeScript
refactor(frontend): convert site components to TypeScript
refactor(admin): add shared draft types for admin tabs
refactor(admin): convert shared UI kit, icons, and useObjectUrls to TypeScript
refactor(admin): convert schedule tab to TypeScript
refactor(admin): convert gallery tab to TypeScript
refactor(admin): convert sponsors tab to TypeScript
refactor(admin): convert team tab to TypeScript
refactor(admin): convert misc tab to TypeScript
refactor(frontend): convert public pages to TypeScript
refactor(frontend): convert admin pages to TypeScript
refactor(frontend): convert App shell and entry point to TypeScript
chore(frontend): drop transitional JS block from ESLint config
```

Each commit is a complete, self-consistent module swap — you can check out
any commit on the branch and the app builds.

## Gotchas checklist (things that will bite you)

- [ ] Postgres `numeric` columns arrive as **strings** in JSON — type API
      rows as `number | string` and `Number()` them in the mapper.
- [ ] `useState([])` infers `never[]` — always pass a type argument.
- [ ] `.filter(Boolean)` doesn't narrow — use a type predicate.
- [ ] `catch` variables are `unknown` — cast or `instanceof` check.
- [ ] Library config objects (motion variants, transitions) need explicit
      type annotations or literal types widen to `string`.
- [ ] `noUnusedParameters` flags params you keep for signature clarity —
      prefix with `_`.
- [ ] Explicit import extensions (`./App.jsx`) break on rename — prefer
      extensionless imports; Vite resolves them.
- [ ] `tsc -b` caches in `node_modules/.tmp/*.tsbuildinfo` — if it ever acts
      stale, delete those files.
