# LLM Semantic Knowledge Contract (LSKC)

VERSION: 1.1-draft

## PURPOSE

LSKC is a semantic intermediate representation for agent-facing knowledge.
It is designed to reduce ambiguity compared to ad-hoc natural-language docs.

LSKC is not "a better YAML style".
YAML is only the transport layer.
The value is stable semantics of sections.

---

## STANDARD VS IMPLEMENTATION

The standard defines:

* section semantics
* classification precedence
* structural validity
* semantic lint expectations

Implementations define:

* conversion prompts
* model-specific extraction behavior
* runtime toolchains

The standard must remain model-agnostic.

---

## ROOT SECTIONS

A specification may contain:

SPEC_VERSION
META
CONTEXT
SYSTEM_MODEL
CONCEPTS
FACTS
CONSTRAINTS
DECISION_RULES
PROCEDURES
AGENT_BEHAVIOR
ANTI_PATTERNS
EXAMPLES
REFERENCES

---

## CLASSIFICATION PRIORITY

When one statement fits multiple categories, choose the highest:

1. CONSTRAINTS
2. FACTS
3. DECISION_RULES
4. PROCEDURES
5. ANTI_PATTERNS
6. EXAMPLES
7. CONTEXT
8. SYSTEM_MODEL

This is normative for converters and semantic validators.

Interpretation note:
Priority does not mean "importance for architecture". It resolves overlap by statement type.
`SYSTEM_MODEL` is topology/shape of the system; `FACTS` is assertion-level truth about behavior/source-of-truth/invariants.
If one sentence can be expressed as both, keep topology in `SYSTEM_MODEL` and keep only the assertion in `FACTS`.

---

## SECTION SEMANTICS

### FACTS

Purpose:
Authoritative current-state truths.

Allowed content:

* observable behavior
* assertion-level architecture truths
* source-of-truth locations
* runtime/storage invariants stated descriptively (without mandatory language) 

Forbidden content:

* mandatory language (`must`, `never`, `required`)
* preferences (`should`, `recommended`)
* action sequences

Example:
"Namespace is used as runtime module identity."

Counter example:
"Namespace must be unique." (belongs to CONSTRAINTS)

Boundary with SYSTEM_MODEL:

* Put placement/topology in `SYSTEM_MODEL` (components, entities, tables, folders, fields, links).
* Put descriptive invariants in `FACTS` ("X is persisted in Y", "runtime source of truth is Z").
* Do not duplicate the same sentence in both sections unless one is topology and the other is a stricter assertion.

Mini example:

```yaml
SYSTEM_MODEL:
  storage:
    module_registry_table: modules
    path_column: modules.path

FACTS:
  module_path_source:
    statement: Module path value is persisted and resolved from modules.path in DB.
    confidence: authoritative
```

Order-invariant example (FACTS vs PROCEDURES):

* `FACTS`: "Install flow guarantees migrations complete before seeders start."
* `PROCEDURES`: "run_migrations -> run_seeders -> warm_cache"

Rule:
Use `FACTS` when the statement declares an invariant truth about ordering.
Use `PROCEDURES` when the statement instructs an executable step sequence.

### CONSTRAINTS

Purpose:
Hard rules whose violation makes output/state invalid.

Allowed content:

* prohibitions
* invariants
* hard requirements

Forbidden content:

* soft preferences
* optional guidance
* plain descriptive facts without obligation

Example:
"Path must follow modules/<ModuleName>."

Counter example:
"Path is stored in DB as modules/<ModuleName>." (belongs to FACTS)

### DECISION_RULES

Purpose:
Preference logic when multiple valid options exist.

Allowed content:

* preferred order
* fallback policies
* tie-break heuristics

Forbidden content:

* hard requirements
* invalid-state definitions

Example:
"Prefer DB discovery, fallback to filesystem."

Counter example:
"Discovery must always use DB." (belongs to CONSTRAINTS)

### PROCEDURES

Purpose:
Ordered task execution.

Allowed content:

* step sequences
* expected result of steps
* conditional branches in steps (e.g. if/else paths)

Forbidden content:

* static facts
* unconditional constraints without steps

Example:
"run_migrations -> run_seeders -> activate_module"

Counter example:
"Migrations are stored in Database/Migrations." (belongs to SYSTEM_MODEL unless used as assertion in FACTS)

Conditional syntax note:

The standard allows domain-specific conditional wording inside `steps`.
Examples:

* `if_parse_success_update_value`
* `if_parse_failure_restore_previous_value`
* `if_entity_missing_return_error`

No fixed DSL is required at this layer; structural schema remains transport-level.

### AGENT_BEHAVIOR

Purpose:
Agent-side preflight and verification policy before/around implementation changes.

Allowed content:

* pre-change verify/check lists
* uncertainty handling rules
* escalation/stop conditions for agent execution

Forbidden content:

* domain runtime procedures that belong to product logic
* full implementation step chains better represented in `PROCEDURES`

Boundary with PROCEDURES:

* `PROCEDURES` describes "how the system/task is executed".
* `AGENT_BEHAVIOR` describes "what the agent must verify before or during edits". 

Mini contrast:

* `PROCEDURES`: `parse_input -> validate -> persist -> return_result`
* `AGENT_BEHAVIOR`: `before_editing_parser: verify: [input_contract, error_handling]`

---

## CONCEPTS (GLOSSARY)

`CONCEPTS` defines canonical terms and local ontology to reduce ambiguity.

Suggested shape:

```yaml
CONCEPTS:
  namespace:
    definition: Runtime identity key for module discovery.
  module_settings:
    definition: Runtime operational key-value store.
```

---

## CONFIDENCE LEVELS

Facts may optionally include confidence metadata:

* `authoritative` — source-backed and stable
* `inferred` — derived from evidence, not explicit
* `volatile` — known to change frequently

Suggested shape:

```yaml
FACTS:
  dependency_source:
    statement: Dependencies are read from module.json.
    confidence: authoritative
```

---

## REFERENCE MODEL

`REFERENCES` may include optional relation fields:

* `DEPENDS_ON`
* `RELATED_CONSTRAINTS`
* `RELATED_FACTS`

These fields enable graph-based traversal for agents and lint tools.

---

## VALIDATION

### Structural validation

Machine-checkable schema:

* `semantic_specification_standard/lskc.schema.json` (single canonical profile)

Canonical profile:

* required: `SPEC_VERSION`, `CONTEXT`, `FACTS`, `CONSTRAINTS`, `PROCEDURES`
* top-level keys restricted to LSKC root sections
* unknown top-level keys forbidden
* flexible payloads for optional sections (domain portability)

### Semantic validation

Schema validates structure only.
Semantic lint should additionally check:

* mandatory language inside FACTS
* preference language inside CONSTRAINTS
* unordered steps in PROCEDURES
* missing glossary concepts for overloaded domain terms

---

## CANONICAL EXAMPLES

The standard should ship with at least:

* small project example
* medium project example
* large project example

Each example should include source doc(s) and expected LSKC output.

---

## BENCHMARK INTENT

LSKC value should be evaluated on agent behavior:

* success rate
* constraint violations
* token usage (input/output/total)
* tool calls / investigations
* output consistency across repeated runs

Target hypothesis:

"LSKC reduces ambiguity and improves agent reliability/predictability versus ad-hoc Markdown."
