# Roundwise Algorithm Specification

This document details the exact mathematical formulas, heuristics, and algorithmic invariants used by the **Roundwise Deterministic Study Plan Generator** and the **SM-2 Spaced-Repetition Scheduler**.

---

## 1. Multi-Company Problem Scoring Engine

### Problem Statement
When a candidate prepares for technical interviews, they often target 2 to 5 companies simultaneously (e.g., Google, Amazon, Microsoft). Standard platforms treat each company in isolation, forcing candidates to either manually cross-reference question lists or solve repetitive patterns.

Roundwise solves this by computing a unified **Cross-Company Yield Score** for every candidate question.

### Scoring Formula

For question $q$ and a set of selected target company slugs $T \subseteq \text{Companies}$:

$$\text{Score}(q, T) = \sum_{c \in T \cap q.\text{companies}} \left( w_{\text{freq}} \cdot \frac{f_{q,c}}{\max_{k \in c} f_{k,c}} + w_{\text{recency}} \cdot R(q, c) \right)$$

Where:
- $f_{q,c} \in [0, 100]$: The historical frequency percentage of question $q$ in company $c$'s interview rounds.
- $\max_{k \in c} f_{k,c}$: The maximum frequency observed for company $c$ across all questions in the dataset (normalizes for companies with lower overall reporting volumes).
- $w_{\text{freq}} = 0.65$: Weight assigned to question frequency.
- $w_{\text{recency}} = 0.35$: Weight assigned to question recency.
- $R(q, c) \in [0, 1]$: Recency scalar derived from the company's reporting windows.

### Recency Weight Table

| Window Tag | Weight $R(q, c)$ | Rationale |
| :--- | :---: | :--- |
| `thirty-days` | **1.00** | Ultra-fresh: problem actively appearing in ongoing placement drives. |
| `three-months` | **0.80** | High current relevance: active hiring season pattern. |
| `six-months` | **0.60** | Medium-term consistency across quarterly review cycles. |
| `more-than-six-months` | **0.40** | Established historical signal. |
| `all` | **0.20** | All-time baseline problem. |

If a question appears in multiple recency windows for a given company, the engine uses:

$$R(q, c) = \max_{t \in q.\text{recency}_c} \text{Weight}(t)$$

### Multi-Company Overlap Natural Boost
Because the sum $\sum_{c \in T \cap q.\text{companies}}$ runs over all target companies that have asked the problem, a problem asked by 3 target companies naturally accumulates roughly $3\times$ the score of a single-company problem. This guarantees that high-yield intersection problems appear first in the study schedule without artificial score inflation.

---

## 2. Difficulty Balancing & Fallback Mechanics

Candidates specify a target difficulty distribution (default: 20% Easy, 60% Medium, 20% Hard).

Given $N = \text{totalDays} \times \text{questionsPerDay}$:

$$\text{Target}_{\text{Easy}} = \text{round}\left(N \cdot \frac{\%_{\text{Easy}}}{100}\right)$$
$$\text{Target}_{\text{Medium}} = \text{round}\left(N \cdot \frac{\%_{\text{Medium}}}{100}\right)$$
$$\text{Target}_{\text{Hard}} = N - \text{Target}_{\text{Easy}} - \text{Target}_{\text{Medium}}$$

### Pool Deficit Fallback
In smaller company catalogs (e.g. niche startups with few reported Hard problems), the candidate pool for a given difficulty may be strictly smaller than the target quota:

$$\text{Available}_{\text{Hard}} < \text{Target}_{\text{Hard}}$$

The engine handles this with graceful degradation:
1. Exhaust available questions in the target bucket.
2. Fill remaining deficit from adjacent difficulty buckets in order of closeness (`Medium` $\to$ `Easy` $\to$ `Hard`).
3. Record a deterministic user-facing warning in `plan.summary.warnings` detailing the substitution.

---

## 3. Daily Schedule Ramp-Up Ordering

Simply selecting top questions can create erratic daily experiences (e.g., 3 Hard questions on Day 1). Roundwise applies a two-pass daily bucket allocator:

1. **Cognitive Load Ceiling:** At most **one Hard question** is permitted per study day.
2. **Difficulty Progression:** Earlier days emphasize Easy and Medium problems to establish foundational invariants (e.g. two-pointer, sliding window, tree traversals) before introducing advanced dynamic programming or graph flow problems.
3. **Deterministic Tie-Breaking:** If two questions have identical score and difficulty, ties are broken by `leetcodeId` ascending, ensuring reproducible plan generation.

---

## 4. Spaced-Repetition Retention (SM-2 Adaptation)

Solving a problem once does not guarantee recall during high-stress placement interviews. Roundwise implements an adapted SuperMemo-2 (SM-2) stage-based scheduling model.

### Review Stages & Intervals

| Stage | Interval | Target Recall Invariant |
| :---: | :---: | :--- |
| **0** | **1 Day** | Next-day recall of approach, invariants, and edge cases. |
| **1** | **3 Days** | Short-term consolidation; re-identifying the pattern without prompt. |
| **2** | **7 Days** | One-week maintenance; writing optimal code from scratch. |
| **3** | **14 Days** | Two-week retention; cross-referencing variation problems. |
| **4** | **30 Days** | Long-term memory; permanent interview readiness. |

### Feedback Transition Rules

Upon reviewing a question in the Revision Queue, the candidate rates their recall:

- **Forgot:** Resets stage to **0** (review again in 1 day).
- **Hard:** Keeps current stage (repeats interval).
- **Good:** Advances stage by $+1$ (clamped to Stage 4).
- **Easy:** Advances stage by $+2$ (clamped to Stage 4).
