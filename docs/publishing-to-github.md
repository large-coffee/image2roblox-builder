# Publishing to GitHub

This project is designed to be publish-ready from initial development.

## Safe to Commit

- Source code in `apps/` and `packages/`
- Shared schemas and templates
- Tests and docs
- `.env.example`, `.gitignore`, `README.md`

## Keep Ignored

- `.env` and any secrets
- local sqlite data files
- generated user project content under `projects/`
- logs, exports, temp files, build outputs
- node_modules and caches

## Clean First Public Push Checklist

1. Run `npm.cmd exec --yes pnpm@10.6.5 -- check:repo`.
2. Verify `.env` is ignored.
3. Verify no API keys/tokens in staged files.
4. Verify `projects/` generated content is not staged.
5. Review `git status --ignored` for accidental includes.

## If a Secret Was Accidentally Committed

1. Revoke or rotate the secret immediately in provider dashboard.
2. Remove secret from working tree and `.env.example` if needed.
3. Rewrite git history if the secret was pushed:
   - use `git filter-repo` or BFG to purge files/strings.
4. Force-push cleaned history if repository policy allows.
5. Rotate any additional tokens that may have been exposed.

## Command Line Publish Flow

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/image2roblox-builder.git
git push -u origin main
```

## GitHub Desktop Publish Flow

1. Add `D:\Codex\image2roblox-builder` as an existing repository.
2. Review file list for secrets and generated outputs.
3. Create the first commit.
4. Publish repository and select visibility.
5. Confirm branch is `main` and remote is correct.
