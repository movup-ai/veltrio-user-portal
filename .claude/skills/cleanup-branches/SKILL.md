---
name: cleanup-branches
description: Delete local git branches in this repo that are fully merged into origin/main and report the ones that are not. Use when the user runs /cleanup-branches or asks to clean up merged local branches.
---

# cleanup-branches

Remove local branches whose work is already in `origin/main`; report everything else.

## Rules

- Only local branches are deleted. Never delete remote branches.
- Never delete `main`, the currently checked-out branch, or a branch checked out in another worktree (`git worktree list`).
- If `git fetch` fails, stop and report — do not judge merge status against stale refs.
- When unsure whether a branch is merged, treat it as unmerged and keep it.

## Steps

1. `git fetch origin --prune`
2. List local branches: `git for-each-ref refs/heads --format="%(refname:short) %(objectname) %(upstream:track)"`
3. Classify each branch other than `main`:
   - **Merged** — it appears in `git branch --merged origin/main`.
   - **Squash-merged** — not an ancestor of `origin/main`, but `gh pr list --head <branch> --state merged --base main --json number,headRefOid` returns a PR whose `headRefOid` equals the local branch tip. (GitHub squash/rebase merges leave no ancestry, so this is the only reliable signal; if the local tip differs from the PR head, the branch has extra local commits — treat it as unmerged.)
   - **Unmerged** — everything else.
4. Delete:
   - Merged: confirm against the same target the classification used — `git merge-base --is-ancestor <branch> origin/main` must exit `0` — then `git branch -D <branch>`. Not `-d`: that checks the branch's own upstream, or `HEAD` once the fetch has pruned a deleted upstream, so it refuses a branch that is fully in `origin/main` whenever local `main` is behind or another branch is checked out. If the ancestor check does not exit `0`, keep the branch and report it as unmerged.
   - Squash-merged: `git branch -D <branch>` (`-d` refuses because ancestry is missing; the PR check above is the safety net)
   - If a delete fails, record the error and move on to the next branch.

## Report

- **Deleted**: each branch, with how it was merged (and PR number when known).
- **Kept — unmerged**: each branch with its commits ahead of `origin/main` (`git rev-list --count origin/main..<branch>`), last commit date, and whether it exists on origin / has an open PR.
- **Skipped**: the current branch or worktree branches that are merged and could be deleted after switching away.

If there is nothing to delete, say so in one line.
