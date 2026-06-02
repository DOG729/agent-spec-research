---
name: lskc-standard
description: Create, review, and validate LSKC semantic specifications from natural-language docs. Use when user asks to convert docs to LSKC, fix section placement (FACTS/CONSTRAINTS/DECISION_RULES/PROCEDURES), enforce classification priority, add CONCEPTS/confidence/reference links, or check compliance against lskc.schema.json.
disable-model-invocation: true
---

# LSKC Standard Skill

## Goal

Produce and maintain high-quality LSKC specifications that are:

- semantically consistent with the standard;
- structurally valid against schema;
- useful for agent reasoning and execution.

## Source of Truth

Use these files as normative references:

- `semantic_specification_standard/Standard.md`
- `semantic_specification_standard/Proxy.md`
- `semantic_specification_standard/lskc.schema.json`

## Section Semantics (Core)

- `FACTS`: current truths only, no mandatory or recommendation language.
- `CONSTRAINTS`: hard rules/invariants; violation means invalid state.
- `DECISION_RULES`: preferences/fallback choices, not hard requirements.
- `PROCEDURES`: ordered steps with predictable result.
- `CONCEPTS`: canonical glossary for ambiguous domain terms.

## Classification Priority

If one statement could fit multiple sections, place it in the highest-priority section:

1. `CONSTRAINTS`
2. `FACTS`
3. `DECISION_RULES`
4. `PROCEDURES`
5. `ANTI_PATTERNS`
6. `EXAMPLES`
7. `CONTEXT`
8. `SYSTEM_MODEL`

Never duplicate one statement across multiple sections just to be "safe".

## Required Workflow

1. Read source material and extract atomic statements.
2. Classify statements using the priority list.
3. Build/update spec with valid top-level LSKC sections.
4. Add `CONCEPTS` for overloaded terms.
5. Add `confidence` to `FACTS` where useful (`authoritative`, `inferred`, `volatile`).
6. Add reference links in `REFERENCES` (`DEPENDS_ON`, `RELATED_CONSTRAINTS`, `RELATED_FACTS`) when available.
7. Validate structure against `lskc.schema.json`.
8. Run semantic sanity checks:
   - mandatory language in `FACTS` -> move to `CONSTRAINTS`
   - soft preference in `CONSTRAINTS` -> move to `DECISION_RULES`
   - unordered actions in `PROCEDURES` -> rewrite as ordered steps

## Output Rules

- Keep `SPEC_VERSION` aligned with current standard version.
- Avoid markdown fences inside YAML values unless explicitly requested.
- Keep statements concise and domain-specific.
- Prefer explicit, testable wording over abstract prose.

## Anti-Patterns

- Treating LSKC as "just YAML formatting".
- Mixing fact + requirement in one sentence.
- Putting recommendations inside `FACTS`.
- Using `CONSTRAINTS` for non-mandatory guidance.
- Leaving domain terms undefined when ambiguity is likely.

## Done Criteria

A result is complete only if:

- section semantics are respected;
- classification priority conflicts are resolved;
- schema profile passes (`lskc.schema.json`);
- no obvious semantic misplacements remain.
