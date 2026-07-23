# Gwuma

<p align="center">
  <strong>Your books. Your folders. Your reading.</strong>
</p>

<p align="center">
  <img alt="Tauri 2" src="https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri&logoColor=white">
  <img alt="React 19" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=20232A">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white">
  <img alt="Rust" src="https://img.shields.io/badge/Rust-stable-000000?logo=rust&logoColor=white">
  <img alt="Zustand" src="https://img.shields.io/badge/state-Zustand-443E38">
  <img alt="pnpm" src="https://img.shields.io/badge/pnpm-10-F69220?logo=pnpm&logoColor=white">
</p>

<p align="center">
  <img alt="Offline first" src="https://img.shields.io/badge/offline--first-yes-63B67A">
  <img alt="Windows" src="https://img.shields.io/badge/Windows-supported-0078D4?logo=windows11&logoColor=white">
  <img alt="Linux" src="https://img.shields.io/badge/Linux-supported-FCC624?logo=linux&logoColor=black">
</p>

Gwuma is an offline-first desktop reading application for personal digital
libraries. It indexes books where they already live, remembers reading
progress locally, and keeps the reading experience free from accounts, cloud
sync, and uploads.

> Gwuma is in active development. The application foundation and design system
> are in place; library indexing and book readers are not yet complete.

## Principles

- **Offline first** — core functionality does not require a network connection.
- **Your files stay yours** — Gwuma does not copy, upload, or modify books.
- **Reading first** — library tools exist to support a focused reading
  experience.
- **Native by default** — Tauri keeps the desktop shell lightweight.
- **Semantic design** — components consume design tokens rather than literal
  colors.

## Current foundation

- Tauri 2 desktop shell with React 19 and TypeScript.
- Feature-first frontend architecture.
- Independent Zustand stores for navigation, dialogs, library, reader,
  settings, and statistics.
- Stack-based navigation and layered dialogs.
- Reusable, domain-agnostic components styled with CSS Modules.
- Dreamy, Satin, Jazz, Helios, and Vibrant themes.
- Global Figtree typography and semantic spacing, radius, motion, and color
  tokens.
- Windows and Linux release automation through GitHub Releases.

## Technology

- **Desktop:** Tauri 2 and Rust
- **Interface:** React 19 and TypeScript
- **Build tooling:** Vite and pnpm
- **State:** Zustand
- **Styling:** CSS Modules and CSS custom properties
- **Versioning:** Changesets
- **Automation:** GitHub Actions

## Prerequisites

Install the following before working on Gwuma:

- [Node.js](https://nodejs.org/) 20 or newer
- [pnpm](https://pnpm.io/) 10 or newer
- [Rust](https://www.rust-lang.org/tools/install) stable
- The [Tauri system dependencies](https://v2.tauri.app/start/prerequisites/)
  for your operating system

## Getting started

```bash
git clone <your-fork-or-repository-url>
cd gwuma
pnpm install
pnpm tauri dev
```

`pnpm install` includes Changesets, ESLint, and the project's other development
tools from `package.json`.

To run only the browser interface:

```bash
pnpm dev
```

## Commands

- `pnpm dev` — start the Vite development server.
- `pnpm tauri dev` — run Gwuma in the Tauri development shell.
- `pnpm build` — typecheck and build the frontend.
- `pnpm tauri build` — create a native production bundle.
- `pnpm lint` — run ESLint.
- `pnpm format` — format supported files with Prettier.
- `pnpm format:check` — verify formatting without changing files.
- `pnpm typecheck` — run TypeScript without emitting files.
- `pnpm check` — run all frontend quality gates.
- `pnpm changeset` — describe a user-facing change.
- `pnpm changeset:status` — inspect pending release changes.
- `pnpm changeset:version` — apply pending versions and synchronize manifests.

## Project structure

```text
src/
├── app/          # application composition and providers
├── components/   # reusable domain-agnostic UI
├── features/     # library, reader, settings, statistics, folders, bookmarks
├── layouts/      # persistent desktop shell regions
├── stores/       # independent Zustand domain stores
├── styles/       # tokens, themes, reset, and global CSS
├── types/        # shared TypeScript contracts
└── utils/        # shared utilities

src-tauri/
├── src/          # Rust application entry and commands
├── capabilities/ # Tauri permission declarations
└── tauri.conf.json
```

## Design conventions

- File and directory names are lowercase; multi-word names use kebab-case.
- React exports use PascalCase.
- Shared components know nothing about books or feature state.
- Feature components connect stores and services to presentational components.
- Component styles live in CSS Modules.
- Colors always use semantic tokens such as `var(--surface)` and
  `var(--text-primary)`.
- Inline color values and Tailwind are not used.

## Release channels

- **Development:** changes on `dev` with a pending Changeset produce
  `-dev.<run>.<sha>` GitHub prereleases.
- **Stable:** Changesets maintains a version PR on `main`. Merging that PR
  publishes a stable GitHub Release if the version tag does not already exist.
- Native artifacts are built for Windows and Linux. Releases are currently
  unsigned.

When connecting the repository to GitHub, create and push the `dev` branch.
Under **Settings → Actions → General**, grant workflows read/write access and
enable GitHub Actions to create pull requests so Changesets can maintain its
version PR. Unsigned releases use the built-in `GITHUB_TOKEN` and require no
additional secret.

## Guides

See [GUIDES.md](GUIDES.md) for how to use and update shared components, themes,
and the current store APIs.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. It
documents branch flow, Conventional Commits, Changesets, quality checks, and
the review checklist.

## Privacy

Gwuma is designed to operate locally. Books are not uploaded, copied, or
modified, and the application does not require an account.
