# Editorial QA

_Phase 6B — editorial quality audit for Knowledge Record v2._

This phase validates editorial corpus consistency before Wave 2 expansion. It performs audit and reporting only — no editorial content generation, no rendering changes, no schema changes, and no KCI modifications.

## Objective

Validate the editorial quality of every Knowledge Record v2 entry, detect inconsistencies, and produce machine-readable audit reports for editorial prioritization.

## Scope

| In scope | Out of scope |
| --- | --- |
| Knowledge Record v2 validation | Wave 2 editorial acquisition |
| Consistency and metadata audits | HTML regeneration |
| Source and confidence checks | Schema or adapter changes |
| Cross-domain heuristics | KCI weight changes |
| Machine-readable reporting | Automatic data correction |

## Audit runner

```bash
node scripts/build/run-editorial-qa.js
```

Output: `audit/editorial-qa.json`

## Audit rules

### Audit 1 — Missing metadata

For every populated domain field, verify presence of:

- `value`
- `confidence`
- `confidenceLevel`
- `sources` (array)
- `notes`

Missing structural fields are reported as issues.

### Audit 2 — Confidence consistency

Frozen thresholds (same as Wave 1 editorial policy):

| Level | Threshold |
| --- | ---: |
| High | ≥ 0.90 |
| Medium | ≥ 0.85 |
| Low | < 0.85 |

Reports mismatches such as `confidence: 0.95` with `confidenceLevel: "low"`.

### Audit 3 — Duplicate editorial text

Groups **identical** text values within each text domain:

- Meaning
- Pronunciation
- Etymology
- History

Clusters with ≥10 unrelated names are reported. Data is not modified.

Note: personalized template text (e.g. history entries ending with a unique name) will not cluster as duplicates even when editorially similar.

### Audit 4 — Source integrity

For every source entry, validate:

- `type` present
- `reference` non-empty
- no duplicate `(type, reference)` pairs within a domain
- `type` is in the accepted list for that domain

### Audit 5 — Editorial completeness

Reports:

- Per-domain coverage (origin, meaning, pronunciation, etymology, history)
- Average populated domains per record
- Distribution of records with 1–5 populated domains

Also reports **source completeness** (populated domains with empty `sources` arrays or null `notes`) as editorial prioritization data — not a structural failure.

### Audit 6 — Cross-domain consistency

Heuristic warnings for suspicious combinations without supporting notes, including:

- Origin language family mismatched with etymology language signals
- Origin language family mismatched with history language signals
- Non-English origin traditions with pronunciation assigned but no pronunciation notes or sources

Warnings are flagged only — never auto-corrected.

### Audit 7 — Name normalization

Detects:

- Duplicate normalized record keys
- Case/display variants
- Spacing variants
- Unicode normalization issues (NFC/NFD)

### Audit 8 — Schema validation

Validates the full Knowledge Record envelope and every record against `schemas/knowledge-record-v2.schema.json`, including domain field structure.

Fails on schema violations.

### Audit 9 — Determinism

Runs the full QA pipeline twice with a fixed timestamp and compares outputs (excluding `generatedAt`). Results must be identical.

## Accepted source types

| Domain | Accepted types |
| --- | --- |
| Origin | `onomastic_dictionary`, `academic_reference`, `biblical_onomastics`, `national_naming_authority`, `historical_name_dictionary` |
| Meaning | Same as origin |
| Pronunciation | `pronouncing_dictionary`, `national_language_authority`, `academic_reference`, `university_pronunciation_guide`, `linguistic_reference` |
| Etymology | `etymological_dictionary`, `historical_name_dictionary`, `academic_reference`, `linguistic_reference`, `national_language_authority` |
| History | `historical_name_dictionary`, `academic_onomastic_reference`, `university_publication`, `historical_linguistic_reference`, `national_language_authority`, `historical_encyclopedia`, `documented_historical_record` |

## Validation rules summary

| Rule | Failure condition |
| --- | --- |
| Structural metadata | Missing required domain subfields |
| Confidence | `confidenceLevel` ≠ frozen threshold mapping |
| Sources | Empty reference, duplicate source, unaccepted type |
| Schema | Record violates Knowledge Record v2 schema |
| Determinism | Non-identical audit output between runs |
| Cross-domain | Warning only (does not fail overall audit) |
| Duplicate text | Informational cluster report (does not fail overall audit) |

## Overall status

| Status | Meaning |
| --- | --- |
| `overallStatus: PASS` | Schema valid, audit completed, determinism passed |
| `editorialQualityStatus: CLEAN` | Zero structural/consistency issues detected |
| `editorialQualityStatus: NEEDS_ATTENTION` | One or more issues or duplicate clusters found |

## Future QA workflow

1. After any editorial apply script or Knowledge Record rebuild:
   ```bash
   node scripts/editorial/build-knowledge-records.js
   node scripts/build/run-editorial-qa.js
   ```
2. Review `audit/editorial-qa.json` before Wave 2 expansion batches.
3. Prioritize fixing:
   - Schema or confidence failures (blocking)
   - Source completeness gaps (resolved in Phase 6C — all 585 origin records now sourced)
   - Cross-domain warnings (editorial review)
4. Re-run equivalence audit after editorial fixes:
   ```bash
   node scripts/build/run-knowledge-record-equivalence.js
   ```

## Phase 6B baseline results

| Metric | Value |
| --- | ---: |
| Knowledge records audited | 757 |
| Entities (unchanged) | 3,697 |
| Schema validation | PASS |
| Determinism | PASS |
| Confidence mismatches | 0 |
| Source integrity issues | 0 |
| Cross-domain warnings | 0 |
| Duplicate text clusters (≥10) | 0 |
| Origin records with empty sources | 167 | **0** |
| Five-domain records | 407 |

## Related artifacts

| File | Role |
| --- | --- |
| `scripts/build/run-editorial-qa.js` | QA runner |
| `audit/editorial-qa.json` | Machine-readable report |
| `docs/KNOWLEDGE_RECORD_V2.md` | Unified record architecture |
| `schemas/knowledge-record-v2.schema.json` | Frozen record schema |
