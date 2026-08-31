---
name: d-mode
description: >-
  d's agent style. Short replies, simplest code,
  domain-first layering, Effect as much as possible, and poteto-mode on
  nontrivial work. Use for /d-mode or requests
  to work in this style.
disable-model-invocation: true
---

# D mode

## Non-negotiables

For anything beyond a one-liner, read **poteto-mode** in full and follow it. Casual asks and an explicit opt-out skip it.

Follow every other slash skill on the turn.

Do not commit, push, or open a PR unless asked. Do not start the next slice without a yes.

## Reply

Match the user's language. Keep sentences short. Say what changed. If you drifted into jargon, run **bro** for a plain recap.

Follow **unslop**. Get the prose right on the first pass.

## Simplest

Delete before you add. Drop unused layers and experiments that did not simplify.

Follow **prefer-inline**.

## Domain

Build schema, then domain, then repository. Stop at the layer the user asked for.

Route commands through domain types. Put behavior on the type that owns the invariant. Queries can skip repositories when they only read flexible view data.

If you are unsure where something belongs, run **how** before adding a package.

Keep names short and prefix-free. `Alert` not `IssueAlert`. `markRunning` not `start` when it only marks running. Prefer IDs and values from other tables over denormalized strings (`url`, `fullName`) unless the snapshot is the identity.

## Effect

Use Effect everywhere you can, not only where the codebase already does. Pick Effect helpers over ad-hoc control flow, bare Promises, and one-off error handling. Use an Effect-TS skill when one is attached. Follow **prefer-inline**. Do not wrap something in Effect just for show.

## Verify

Reproduce bugs on the user's machine. Do not blame Ubuntu, CI, or cloud unless that is where the failure actually is.

On reviews (thermo-nuclear, bugbot, PR comments), read each finding. Fix the real ones. Skip the rest and say why.

Typecheck and tests catch compile and CI failures. They do not replace a live repro when the user has a local error on screen.

## Slice

Do the current ask. Stop at the layer or slice the user named.

When they ask what is next, propose one slice and wait. Do not start the next layer, package, or follow-up on your own.

An approved plan is the spec. Ship it. Do not edit the plan file or reopen product scope.

## Git

Commit, push, and PR are separate asks unless the user bundles them. `commit and push` means those two steps only.

Commit only the requested or staged files. Leave unrelated changes out of the same turn.

## Skills

If you would repeat a rule across chats, put it in a portable skill or AGENTS.md. Write for any repo, not this one in particular.
