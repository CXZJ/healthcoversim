# Issue tracker: Local Markdown

Issues and specs live as Markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- Spec: `.scratch/<feature-slug>/spec.md`
- Implementation tickets: `.scratch/<feature-slug>/issues/<NN>-<slug>.md`,
  numbered from `01`, with one file per ticket.
- Record triage state in a `Status:` line near the top.
  Use the roles in `triage-labels.md`.
- Record dependencies in a `Blocked by: NN, NN` line.
- Append discussion under `## Comments`.

## Publish and fetch

Publishing means creating a file in the relevant feature directory.
Fetching means reading the referenced spec or ticket file.

## Wayfinding operations

- Map: `.scratch/<effort>/map.md`, containing Notes,
  Decisions-so-far, and Fog.
- Child tickets: `.scratch/<effort>/issues/NN-<slug>.md`.
- Record `Type:` as research, prototype, grilling, or task.
- Record `Status:` as open, claimed, or resolved.
- A ticket is unblocked when every ticket in its `Blocked by:` line
  is resolved.
- The frontier contains open, unblocked, unclaimed tickets.
  Choose the lowest number first.
- Claim by saving `Status: claimed` before starting work.
- Resolve by appending `## Answer`, setting `Status: resolved`,
  and adding a summary and link to the map's Decisions-so-far.
