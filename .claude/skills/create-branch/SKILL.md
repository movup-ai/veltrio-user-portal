---
name: create-branch
description: Create a new git branch off the latest origin/main in this repo. Use when the user runs /create-branch or asks to start a new branch from main.
argument-hint: <branch_name>
---

# create-branch

Create a branch named `$ARGUMENTS` from the latest `origin/main`.

## Rules

- Run each git command separately and check its result before running the next one.
- **If any command fails, stop immediately.** Do not retry, work around it, or continue with later steps. Report the command, its error output, and the state the repo is now in (current branch, whether anything changed).
- Never stash, commit, discard, or reset the user's changes to get past a problem.

## Steps

1. If no branch name was provided, ask for one and stop.
2. `git status --porcelain` — if there are uncommitted changes (staged, unstaged, or untracked files that would block the switch) and the current branch is not `main`, **pause**: list the changed files and ask the user how they want to handle them. Do not switch branches.
3. Check the name is free: `git branch --list <branch_name>` and `git ls-remote --heads origin <branch_name>`. If it already exists locally or on origin, stop and report.
4. `git switch main`
5. `git pull --ff-only origin main` — if main cannot fast-forward (local main has diverged), stop and report.
6. `git rev-list --count origin/main..main` — must print `0`. The pull above also succeeds when local `main` is *ahead* of origin (origin's commits are already in its history), and a branch cut from it would carry those unpublished commits. If the count is not `0`, stop and report them (`git log --oneline origin/main..main`). Do not reset `main` or branch from `origin/main` instead on your own.
7. `git switch -c <branch_name>`

## Report

One or two lines: the repo, the new branch name, and the commit of `main` it was created from (`git log -1 --oneline`).
