# Contributing to Gwuma

Thank you for helping build Gwuma. Contributions should preserve its
offline-first, file-respecting, reading-focused product principles.

## Before you begin

Install:

- Node.js 20 or newer
- pnpm 10 or newer
- Rust stable
- Tauri 2 system dependencies for your operating system

Install the project dependencies:

```bash
pnpm install
```

This includes Changesets, ESLint, and the project's other development tools.

## Branch workflow

- `main` contains stable, releasable code.
- `dev` is the integration branch and source of development prereleases.
- Create a short-lived branch from `dev` for each contribution.
- Use a descriptive lowercase branch name, such as
  `feat/library-folder-picker` or `fix/dialog-focus`.
- Open pull requests into `dev`. Stable promotion happens through the
  maintainers' release flow.
- Keep a branch focused on one concern and rebase or merge `dev` before final
  review when requested.

Typical workflow:

```bash
git switch dev
git pull
git switch -c feat/reader-toolbar
```

## Development standards

### File naming

- Use lowercase file and folder names.
- Hyphenate multi-word names: `book-cover.tsx`, `dialog-host/`.
- React components and exported types remain PascalCase in source.
- Stores follow `domain.store.ts`.
- CSS Modules follow `component.module.css`.

### React and TypeScript

- Keep shared components presentational and domain-agnostic.
- Keep business behavior inside feature modules.
- Use independent domain stores rather than a global catch-all store.
- Prefer explicit, narrow types; avoid `any`.
- Preserve accessibility semantics, keyboard operation, and visible focus.
- Do not introduce URL routing for in-app navigation without an architecture
  discussion.

### Styling

- Use CSS Modules for component and layout styles.
- Use semantic design tokens for color, spacing, radius, typography, motion,
  and shadows.
- Never place literal colors in component CSS.
- Do not use Tailwind or inline color styles.
- Every theme must expose the same semantic color token contract.

### Rust and Tauri

- Keep Tauri commands narrow and typed.
- Request only the capabilities required by a feature.
- Do not upload, copy, or modify a user's books.
- Keep filesystem and database work off the UI thread.
- Run formatting and Clippy before requesting review.

## Conventional Commits

Every commit uses:

```text
type(scope): imperative lowercase description
```

Allowed types:

- `feat` — a new user-facing capability
- `fix` — a defect correction
- `docs` — documentation only
- `style` — formatting or visual changes without behavior changes
- `refactor` — internal restructuring without feature or fix behavior
- `perf` — performance improvement
- `test` — test additions or corrections
- `build` — build system or dependency changes
- `ci` — automation and workflow changes
- `chore` — maintenance that fits no other type
- `revert` — revert an earlier commit

Use a concise feature or domain as the optional scope:

```text
feat(library): add folder empty state
fix(dialog): restore focus after close
style(button): refine pressed texture
docs(contributing): explain release branches
ci(release): publish linux and windows bundles
```

Write the subject in the imperative mood: “add”, “fix”, or “update”, not
“added”, “fixes”, or “updating”. Do not end it with a period.

For breaking changes, add `!` and explain the migration in the footer:

```text
feat(reader)!: replace position persistence format

BREAKING CHANGE: stored reader positions must be migrated to locator objects.
```

Commits should be logically complete and buildable. Avoid mixing generated
formatting changes with unrelated behavior.

## Changesets

Add a Changeset for any change that should appear in release notes or alter the
application version:

```bash
pnpm changeset
```

Choose:

- **patch** for fixes and small compatible refinements
- **minor** for compatible features
- **major** for breaking behavior or data contracts

Write the summary for users, not implementers. Commit the generated
`.changeset/<name>.md` file with your work.

A Changeset is normally unnecessary for documentation-only changes, tests,
formatting, CI maintenance, or internal refactors with no user-visible effect.
When uncertain, include one or explain its omission in the pull request.

Inspect pending release intent with:

```bash
pnpm changeset:status
```

Do not manually edit application versions. The release workflow applies
Changesets and synchronizes `package.json`, `src-tauri/tauri.conf.json`, and
`src-tauri/Cargo.toml`.

## Quality checks

Run before pushing:

```bash
pnpm check
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo check --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
```

Tests should accompany behavior once the relevant test harness exists. Do not
add placeholder tests or scripts solely to satisfy a checklist.

## Pull requests

A pull request should:

- explain the user problem and the chosen solution
- stay limited to one coherent change
- include a Changeset or explain why none is needed
- include screenshots or recordings for visual changes
- document manual verification
- pass frontend and Rust CI
- update documentation when behavior or architecture changes
- avoid unrelated generated or formatting churn

Review comments should be resolved with follow-up commits. Do not force-push a
shared branch unless the maintainers request it.

## Releases

Pushes to `dev` publish a prerelease only when a pending Changeset exists.
Changesets on `main` create or update a version pull request. After that pull
request is merged, GitHub Actions creates the stable Windows and Linux release.

Maintainers should not create version tags manually; the workflows use the
application version as the release tag and skip versions that already exist.

## Security and privacy

Do not open a public issue containing a credential, a private book path, or
other sensitive user data. Share security reports privately with the
maintainers once the repository's security contact is published.
