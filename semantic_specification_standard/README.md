# LLM Semantic Knowledge Contract (LSKC)

This directory contains the LSKC standard and supporting artifacts.

## Files

- `Standard.md` — normative semantic standard (v1.1-draft).
- `Proxy.md` — markdown-to-LSKC conversion proxy guidance.
- `lskc.schema.json` — canonical structural schema.
- `example/` — example contracts.
  - `ModuleSystem.yaml`
  - `JSONSaveEditor.yaml`
  - `DungeonRunner.yaml`
  - `SolarExpanseSaveEditor.yaml`
  - `WWMRussianLocalization.yaml`

## What LSKC is

LSKC is a semantic intermediate representation for LLM agents.

It is not a "new YAML style". YAML is just transport.
The core value is stable section semantics:

- `FACTS`
- `CONSTRAINTS`
- `DECISION_RULES`
- `PROCEDURES`
- `AGENT_BEHAVIOR`

## Validation

### Canonical profile (`lskc.schema.json`)

Requires core operational sections:

- `CONTEXT`
- `FACTS`
- `CONSTRAINTS`
- `PROCEDURES`

Also:

- requires `SPEC_VERSION`
- restricts allowed top-level sections
- blocks unknown top-level keys
- allows flexible payloads for optional sections

## Structural vs semantic validation

Schema checks structure only.
Semantic quality should be checked by a separate validator/lint, for example:

- mandatory language accidentally placed in `FACTS`
- preference language accidentally placed in `CONSTRAINTS`
- missing ordered steps in `PROCEDURES`
- unresolved overloaded terms without `CONCEPTS`

## Recommended workflow

1. Convert source docs using `Proxy.md`.
2. Validate against `lskc.schema.json`.
3. Run semantic lint checks.
4. Use resulting contract as agent input.
