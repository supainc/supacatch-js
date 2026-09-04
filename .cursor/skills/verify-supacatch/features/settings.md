# Settings

Settings is the organization hub: signed-in users open it from the primary sidebar and follow cards into Organization, Members, Slack, GitHub, and Claude pages.

## Sub-features

- `settings-hub` lists the five settings cards under the Settings heading.
- `settings-organization` opens Organization profile and ownership.
- `settings-members` opens Members invites and roles.
- `settings-slack` opens Slack workspace connection (page heading is Integrations).
- `settings-github` opens GitHub account connection.
- `settings-claude` opens the Organization Anthropic key and model.

## How to get to it (user POV)

- Choose **Settings** in the primary sidebar.
- Open `/settings`.
- Choose a card: **Organization**, **Members**, **Slack**, **GitHub**, or **Claude**.
- From the organization menu, choose **Organization Settings** (`/settings/organization`) or **Members** (`/settings/members`).

## Driving it with control-supacatch

Preconditions:

- `control-supacatch doctor` reports `ok: true`.
- Signed-in browser profile; `/onboarding` is not shown.
- Do not complete Slack or GitHub OAuth, transfer ownership, or delete the organization in this recipe.

- **Open hub.** Run `control-supacatch browser goto --path /settings`. Heading is `Settings`. Cards named `Organization`, `Members`, `Slack`, `GitHub`, and `Claude` are present.
- **Organization.** Run `control-supacatch browser click --role link --name "Organization"`. Heading is `Organization`.
- **Members.** Run `control-supacatch browser goto --path /settings`, then `control-supacatch browser click --role link --name "Members"`. Heading is `Members`.
- **Slack.** Run `control-supacatch browser goto --path /settings`, then `control-supacatch browser click --role link --name "Slack"`. Heading is `Integrations` (not `Slack`); breadcrumb text `Settings` is visible. Stop before `Connect Slack`.
- **GitHub.** Run `control-supacatch browser goto --path /settings`, then `control-supacatch browser click --role link --name "GitHub"`. Heading is `GitHub`. Stop before `Connect GitHub`.
- **Claude.** Run `control-supacatch browser goto --path /settings`, then `control-supacatch browser click --role link --name "Claude"`. Heading is `Claude`.
- **Proof.** Capture the hub with all five cards. Run `control-supacatch browser goto --path /settings`, `control-supacatch browser snapshot --aria --path artifacts/settings/hub.aria.txt`, and `control-supacatch browser screenshot --path artifacts/settings/hub.png`.

## Gotchas

- The Slack card label is `Slack`; the destination page heading is `Integrations`.
- Connect Slack / Connect GitHub leave localhost for vendor OAuth. Do not treat that redirect as a hub failure.
- Organization rename, ownership transfer, member invite, and Claude key save mutate the live org. Stop at page headings unless the run is explicitly testing those mutations.
