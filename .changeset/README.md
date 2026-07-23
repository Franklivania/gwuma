# Changesets

Changesets record user-visible release intent independently from Git commits.

Create one while working on a feature or fix:

```bash
pnpm changeset
```

Choose a semantic version impact and write a short user-facing summary. Commit
the generated Markdown file with the change.

- `patch` — compatible fixes and small refinements
- `minor` — compatible new features
- `major` — breaking behavior or data contracts

Documentation, tests, formatting, CI-only work, and invisible refactors
normally do not need a Changeset.

On `dev`, pending Changesets authorize a development prerelease. On `main`,
the Changesets action creates a version pull request. Merging that pull request
updates the changelog and all application manifests, then allows the stable
GitHub Release workflow to publish native bundles.

Do not edit application versions manually.
