# Changesets

This folder is used by [Changesets](https://github.com/changesets/changesets) to manage versioning and changelogs.

## How to use

When you make changes that should be released:

```bash
pnpm changeset
```

This will prompt you to:
1. Select which packages have changed
2. Choose the bump type (patch/minor/major)
3. Write a summary of changes

Then commit the generated changeset file.
