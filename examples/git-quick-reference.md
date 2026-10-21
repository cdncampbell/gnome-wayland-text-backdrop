# Git Quick Reference

> Commit early, push often, and read `git status` before anything you can't undo.

## Every day

| Command                 | What it does                                    |
|-------------------------|-------------------------------------------------|
| `git status -sb`        | What changed, and where the branch stands       |
| `git diff`              | Unstaged changes (`--staged` for staged ones)   |
| `git add -p`            | Stage a file **piece by piece**                 |
| `git commit`            | Record the staged changes                       |
| `git pull --ff-only`    | Update without creating a merge commit          |
| `git push -u origin HEAD` | Push a new branch and track it                |
| `git log --oneline -20` | The last 20 commits, one line each              |

## Branches

| Command                     | What it does                          |
|-----------------------------|---------------------------------------|
| `git switch -c feature/x`   | Create a branch and move to it        |
| `git switch main`           | Go back to `main`                     |
| `git branch -d feature/x`   | Delete a branch that's merged         |
| `git fetch --prune`         | Forget branches deleted on the remote |
| `git rebase main`           | Replay this branch on top of `main`   |

## Undoing things

| Situation                          | Command                          | Safe? |
|:-----------------------------------|:---------------------------------|:-----:|
| Unstage a file                     | `git restore --staged file`      |  yes  |
| Throw away edits to a file         | `git restore file`               |  ~~no~~ *gone* |
| Fix the last commit's message      | `git commit --amend`             | local |
| Undo a pushed commit               | `git revert <sha>`               |  yes  |
| Move the branch back, keep changes | `git reset --soft HEAD~1`        | local |

> **Never** `reset --hard` or force-push a branch someone else is using.

## When it goes wrong

```sh
git reflog                    # every place HEAD has been, even "lost" commits
git switch -c rescue <sha>    # put a lost commit on a branch
git stash push -m "wip"       # park changes, then: git stash pop
git merge --abort             # back out of a conflicted merge
```

## Before you push

- [x] Tests pass locally
- [x] `git diff --staged` reviewed
- [ ] Commit message says *why*, not just what
- [ ] Branch is up to date with `main`

---

More: [Pro Git](https://git-scm.com/book) · `git help <command>`
