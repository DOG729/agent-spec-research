# Agent Specification Research

## Goal

Verify whether a structured agent specification (custom YAML contract format) provides advantages over traditional Markdown instructions.

Research should focus not only on token consumption, but also on execution quality, policy compliance, and behavior predictability.

---

# Main Hypothesis

The advantage may not come from YAML itself.

The advantage may come from representing agent memory and behavior as a structured contract rather than descriptive text.

Hypothesis:

* fewer tokens
* fewer policy violations
* less behavioral variance
* more predictable execution
* fewer unnecessary investigations
* better long-running agent behavior

---

# Formats To Compare

## Variant A — Markdown

Traditional AGENTS.md / MEMORY.md approach.

Example:

```md
Avoid excessive session recovery attempts.
Prefer API access over browser usage.
Try to minimize token consumption.
```

---

## Variant B — Structured YAML

Custom contract format.

Example:

```yaml
session:
  recovery_attempts: 1
  create_new_if_missing: true

browser:
  api_first: true

cost_control:
  max_steps: 3
```

---

## Variant C — Hybrid

YAML contract + short Markdown explanation.

Example:

```yaml
session:
  recovery_attempts: 1
```

```md
Purpose:
Avoid wasting tokens on recovery operations.
```

---

# Test Categories

## Category 1 — Specification Reproduction

Input:

* documentation
* architecture notes
* requirements

Task:

Convert to specification.

Measure:

* information preserved
* information lost
* hallucinated rules
* structural consistency

---

## Category 2 — Coding Tasks

Tasks involving:

* implementation
* refactoring
* architecture changes

Measure:

* correctness
* architecture compliance
* code quality

Watch for:

* duplicated logic
* unnecessary complexity
* forbidden patterns

---

## Category 3 — Debugging

Tasks involving:

* bug analysis
* root cause investigation
* issue resolution

Measure:

* accuracy
* investigation efficiency
* recovery behavior

Watch for:

* endless investigations
* unnecessary exploration

---

## Category 4 — GitHub / Issue Processing

Tasks involving:

* issue classification
* documentation lookup
* bug triage

Measure:

* classification accuracy
* policy compliance
* response quality

---

## Category 5 — Long Running Agents

Examples:

* OpenClaw agents
* Cursor agents
* Claude Code workflows

Measure:

* token efficiency
* consistency
* memory quality
* policy compliance over time

---

# Metrics

## 1. Policy Compliance

Most important metric.

Track:

* rule violations
* ignored instructions
* unexpected behavior

Example:

```yaml
session:
  recovery_attempts: 1
```

Did the agent obey the rule?

---

## 2. Task Success Rate

Classify results:

* Success
* Partial Success
* Failure

Calculate average success rate.

---

## 3. Behavioral Variance

Run identical task multiple times.

Recommended:

* 5 runs minimum
* 10 runs preferred

Measure:

* consistency of decisions
* consistency of outputs

Question:

Does the format reduce behavioral randomness?

---

## 4. Token Consumption

Measure:

* input tokens
* output tokens
* reasoning tokens (if available)
* total tokens

Compare averages.

Example:

```text
Markdown: 3020000
YAML:     2811000
```

---

## 5. Agent Step Count

Especially important for OpenClaw.

Measure:

* number of actions
* number of investigations
* number of tool calls

Question:

Does the format reduce unnecessary steps?

---

## 6. Recovery Loop Resistance

Special test.

Scenario:

* missing session
* broken session
* missing resource

Observe:

* creates new session
* endless investigation
* recovery loops

Goal:

Measure tendency toward "heroic recovery behavior".

---

## 7. Code Quality

Track:

* use of eval
* use of any
* duplicated logic
* architecture violations
* ignored requirements

Question:

Does the specification reduce low quality shortcuts?

---

# Suggested Result Table

| Metric             | Markdown | YAML | Hybrid |
| ------------------ | -------- | ---- | ------ |
| Success Rate       |          |      |        |
| Policy Violations  |          |      |        |
| Average Tokens     |          |      |        |
| Average Steps      |          |      |        |
| Recovery Loops     |          |      |        |
| Code Quality Score |          |      |        |
| Variance Score     |          |      |        |

---

# Important Observation

The research should NOT attempt to prove:

"YAML is better than Markdown."

Instead test:

"Structured contracts reduce the solution space available to an agent."

Potential outcomes:

* improved predictability
* fewer policy violations
* reduced token usage
* improved consistency

---

# Desired Conclusion

Strong conclusion:

Structured agent contracts improve reliability and predictability of agent behavior.

Weak conclusion:

YAML is slightly more token efficient.

The first result is significantly more valuable than the second.

---

# Pilot: module_system specification chain

Journal: [`module_system_conversion_results/plan.md`](module_system_conversion_results/plan.md)

**Provenance (do not confuse layers):**

```text
L0 module_system.yaml   — domain etalon (legacy)
L1 module_system.md     — derived from L0; phase-1 input
L2 module_system-TEST.yaml — md→yaml per model
L3 module_system-REVERSE.md — yaml→md
```

Agents were forbidden to read L0 during runs. Compare L3 vs L2 for phase-2 loss; L3 vs L0 only post-hoc.

**Criticality (see journal):** C0=critical … C4=negligible; HX=healing. test2 L2=C0; test3 L2=C2 (recommended). Threshold for code specs: no C0 in L2.

---

# Future Work

If results are positive:

* publish specification format
* publish benchmark tasks
* publish comparison results
* test across multiple models

Models to test:

* GPT
* Claude
* Gemini
* Qwen
* Open source reasoning models

Goal:

Determine whether structured agent contracts can become a practical standard for long-running agent systems.
