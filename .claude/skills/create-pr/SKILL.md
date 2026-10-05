---
name: create-pr
description: Open a GitHub pull request against main for the current branch (or a named branch) in this repo, with a summary written from the branch's commits. Use when the user runs /create-pr or asks to open a PR.
argument-hint: "[branch_name]"
---

# create-pr

Open a pull request into `main`. Branch argument: `$ARGUMENTS` (optional — when empty, use the current branch).

## Rules

- Run each command separately and check its result before the next one.
- **If any command fails, stop and report** the command, its error output, and the current state. Do not work around it.
- Never stash, commit, discard, or reset the user's changes. Never force-push.

## Steps

1. `git fetch origin --prune` to get the latest remote changes and branches.
2. Pick the branch:
   - No argument: use the current branch (`git branch --show-current`).
   - Argument given and it is not the current branch: `git switch <branch_name>` (git creates a tracking branch if it only exists on origin). If uncommitted changes block the switch, or the branch exists nowhere, stop and report.
3. Stop and report if any of these hold:
   - The branch is `main`.
   - `git log origin/main..HEAD --oneline` is empty (nothing to open a PR for).
   - `gh pr list --head <branch> --state open --json number,url` already returns a PR — report its URL instead of creating another.
4. Check the branch against the latest `origin/main`:
   - `git rev-list --count HEAD..origin/main` — how many commits the branch is behind.
   - If it is behind, test for conflicts without touching the working tree: `git merge-tree --write-tree --name-only origin/main HEAD`. Exit code 1 means conflicts, and the output lists the conflicting files.
   - **Conflicts**: stop before pushing. Report how far behind the branch is and the conflicting files, and ask whether the user wants to merge or rebase onto `origin/main`. Do not update the branch on your own.
   - **Behind but no conflicts**: continue, and include "N commits behind main, merges cleanly" in the final report.
5. If there are uncommitted changes on the branch, mention that they will not be part of the PR, then continue.
6. Publish the branch: `git push -u origin <branch>`. If the push is rejected (remote has commits the local branch lacks), stop and report.
7. Gather material for the description:
   - `git log origin/main..HEAD --reverse --format="%h %s%n%b"`
   - `git diff origin/main...HEAD --stat`
   - Read parts of the diff only where the commit messages do not explain the change.
8. If the repo has a PR template (`.github/pull_request_template.md` or `.github/PULL_REQUEST_TEMPLATE/`), fill it in. Otherwise use:

   ```
   ## Summary
   <1-3 sentences: what this PR does and why, taken from the commits>

   ## Changes
   - <one bullet per logical change, grouped — not one per commit when commits overlap>

   ## Notes
   <migrations, config/env changes, follow-ups, anything reviewers must know — omit the section if none>
   ```

   Describe only what the commits and diff show. Do not invent testing claims or ticket numbers; include a ticket reference only if it appears in the branch name or commits.
9. Title: a short imperative sentence (under 70 characters) covering the whole branch. With a single commit, reuse its subject.
10. Write the body to a temporary file and run `gh pr create --base main --head <branch> --title "<title>" --body-file <file>`.

## Report

The PR URL, its title, and the number of commits included.
