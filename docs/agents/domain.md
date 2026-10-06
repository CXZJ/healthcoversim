# Domain Docs

## Layout

This project uses a single context:

- `GLOSSARY.md` at the repository root defines domain vocabulary.
- `docs/adr/` holds architectural decision records.

## Before exploring

Read the glossary and any ADRs relevant to the area being explored.
If these files do not exist, proceed silently.
Domain modeling creates them as terms and decisions are resolved.

## Use shared vocabulary

Use the glossary's terms in code, tests, tickets, and explanations.
When a needed concept is missing, reconsider the term or note the
gap for domain modeling.

## ADR conflicts

If a proposed change contradicts an ADR, identify the conflict
and explain why the decision should be reconsidered.
