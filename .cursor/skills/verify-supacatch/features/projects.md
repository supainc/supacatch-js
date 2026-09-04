# Projects

Projects lists services in the active organization, creates a project (one-time ingest key), and opens a project home with key rotation and GitHub linking.

## Sub-features

- `projects-empty` shows the empty state when there are no projects.
- `projects-list` shows project cards with issue and event counts.
- `projects-create` opens the create dialog, submits a name, and reveals the ingest key once.
- `projects-create-cancel` closes the dialog without creating.
- `projects-open` opens a project from its name link.

## How to get to it (user POV)

- Choose **Projects** in the primary sidebar.
- Open `/projects`.
- Choose **Create Project**, or a project name on a card.
- After onboarding, a completed flow redirects to `/projects`.

## Driving it with control-supacatch

Preconditions:

- `control-supacatch doctor` reports `ok: true`.
- Signed-in browser profile; role that can create projects (owner/admin) for create recipes.
- No leftover project named `verify-project` unless the recipe is reopening it.

- **List.** Open projects. Run `control-supacatch browser goto --path /projects`. Heading is `All Projects`. Either cards with name links or `No Projects yet. Create one to get started.`
- **Open create.** Choose Create Project. Run `control-supacatch browser click --role button --name "Create Project"`. Dialog heading `Create Project` and textbox `Project name` appear.
- **Cancel.** Choose Cancel. Run `control-supacatch browser click --role button --name "Cancel"`. The dialog closes; no new card named from a draft.
- **Create.** Reopen create, fill `verify-project`, choose Create project. Run `control-supacatch browser fill --role textbox --name "Project name" --value "verify-project"` and `control-supacatch browser click --role button --name "Create project"`. Heading becomes `Project created`; an Ingest Key `sck_` value is visible; Copy and Done are present.
- **Dismiss key.** Choose Done. Run `control-supacatch browser click --role button --name "Done"`. The list includes a link `verify-project`.
- **Open project.** Choose that link. Run `control-supacatch browser click --role link --name "verify-project"`. The project home heading is `verify-project`.
- **Proof.** Capture the list including `verify-project`. Run `control-supacatch browser snapshot --aria --path artifacts/projects/list.aria.txt` and `control-supacatch browser screenshot --path artifacts/projects/list.png`. Copy the ingest key from the create dialog screenshot if the recipe ingested with it.

## Gotchas

- The ingest key is shown once at create (and again only after rotate on the project page). A list screenshot cannot prove the key.
- Create Project is hidden when `canCreateProject` is false. That is a permissions miss, not an empty-state miss.
- Delete/rename live on the project page overflow, not on this list recipe.
