# Markdown To LSKC Conversion Proxy

VERSION: 1.0

## OBJECTIVE

Convert arbitrary Markdown documentation into a valid
LSKC specification.

The goal is semantic extraction.

Do not preserve Markdown structure.

Preserve meaning.

---

## PROCESS

For each paragraph:

Determine its semantic category.

Place information into exactly one primary section.

---

## CLASSIFICATION ORDER

Use the following priority:

1. CONSTRAINTS
2. FACTS
3. DECISION_RULES
4. PROCEDURES
5. ANTI_PATTERNS
6. EXAMPLES
7. CONTEXT
8. SYSTEM_MODEL

When multiple categories are possible,
choose the highest category.

---

## EXTRACTION RULES

### CONSTRAINTS

Indicators:

* must
* mandatory
* required
* forbidden
* prohibited
* never
* always

Question:

Does violating this statement create an invalid state?

If yes:

Store in CONSTRAINTS.

---

### FACTS

Question:

Does this describe current reality?

If yes:

Store in FACTS.

---

### DECISION_RULES

Indicators:

* should
* preferred
* recommended
* usually

Question:

Is this guidance rather than a requirement?

If yes:

Store in DECISION_RULES.

---

### PROCEDURES

Indicators:

* step
* first
* then
* after
* finally

Question:

Is this an action sequence?

If yes:

Store in PROCEDURES.

---

### ANTI_PATTERNS

Indicators:

* common mistake
* avoid
* incorrect assumption
* do not assume

Question:

Does this describe a known failure mode?

If yes:

Store in ANTI_PATTERNS.

---

### EXAMPLES

Indicators:

* example
* sample
* demonstration
* code snippet

Store in EXAMPLES.

---

### CONTEXT

Question:

Does this define applicability,
assumptions,
or scope?

If yes:

Store in CONTEXT.

---

### SYSTEM_MODEL

Question:

Does this describe components,
layers,
services,
or relationships?

If yes:

Store in SYSTEM_MODEL.

---

## NORMALIZATION RULES

Convert prose into atomic statements.

Split compound sentences.

Remove repetition.

Promote implicit constraints to explicit constraints.

Promote implicit assumptions to context.

Extract relationships into SYSTEM_MODEL.

---

## OUTPUT REQUIREMENTS

Output must:

* follow LSKC structure
* contain semantic sections only
* avoid Markdown hierarchy
* avoid duplicated knowledge
* preserve original meaning
