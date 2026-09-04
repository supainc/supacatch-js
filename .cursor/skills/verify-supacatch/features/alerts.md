# Alerts

Alerts lists notification rules for the organization and opens a create form for members who can manage alerts.

## Sub-features

- `alerts-empty` shows the empty state when there are no alerts.
- `alerts-list` shows each alert name, Issue Opened conditions, and destinations.
- `alerts-create-open` opens the create form from Create Alert.

## How to get to it (user POV)

- Choose **Alerts** in the primary sidebar.
- Open `/alerts`.
- Choose **Create Alert**.

## Driving it with control-supacatch

Preconditions:

- `control-supacatch doctor` reports `ok: true`.
- Signed-in browser profile with onboarding complete.
- Create Alert requires `canManageAlerts`. Slack destinations need a connected Slack app; email destinations need members. Do not invent a Slack install for this map.

- **Open alerts.** Run `control-supacatch browser goto --path /alerts`. Heading is `Alerts`.
- **Empty.** With no alerts: `No Alerts yet` and `Create one to notify a Destination when an Issue is opened.`
- **Open create.** If the button exists, run `control-supacatch browser click --role button --name "Create Alert"`. The create form is visible (not the empty-state-only page).
- **Proof.** Capture the alerts heading and either the empty copy or a named alert. Run `control-supacatch browser snapshot --aria --path artifacts/alerts/page.aria.txt` and `control-supacatch browser screenshot --path artifacts/alerts/page.png`.

## Gotchas

- Create Alert is omitted for members without permission. Missing button is not an empty-state bug.
- Completing create with Slack needs a live Slack connection. Stop at open-create unless Slack is already installed for this org.
- Test destination buttons on an existing alert send real mail/Slack. Do not fire them unless the recipe is explicitly testing delivery.
