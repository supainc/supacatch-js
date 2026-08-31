---
name: prefer-inline
description: >-
  Keep logic inline instead of extracting thin wrapper functions. Use when
  writing, extracting, renaming, or reviewing helpers, wrappers, DRY refactors,
  or one-line functions. Reuse alone is not a reason to extract if the
  expression already carries meaning.
---

# Prefer inline

Keep the expression at the call site. A name that only restates a short
expression pretends there is more going on than there is.

Reuse is not enough. Duplicate a clear expression before you extract a wrapper
that hides it.

## Extract when

- The body has real behavior. Branching, side effects, invariants, or more than
  one step that the expression does not already show.
- The name marks a public boundary. An exported API, a domain method, or a
  command.

## Keep inline when

- The name wraps or forwards a short expression.
- The helper has one caller.
- Call sites would read the same or better with the expression itself, even if
  it appears twice.

Before you extract, read the call site with the body pasted in. If the reader
already knows what it does, leave it there.

## Fail

```
githubPullRequestUrl(repo, n) => "https://github.com/" + repo + "/pull/" + n
```

```
isUnresolved(status) => status == "unresolved"
```

A function whose body is one return of its arguments rearranged.

## Pass

An exported method that updates status and records activity.

A parse at a system boundary that turns untrusted input into a domain value.

## Gotchas

- Do not extract a one-liner so a test can mock it. Test the caller.
- A framework helper on a public method is a boundary. Leave it. A local helper
  that only forwards is still a wrapper. Inline it.
- Two call sites sharing a URL template, equality check, or field read is not a
  missing helper. Shared decisions are.
