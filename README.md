<div align="center">

# PRAMANA

**Behavioural integrity assurance for multi-contributor computer-vision pipelines**

Smart India Hackathon 2026 · Problem Statement **SIH26228**
Ministry of Defence · Indian Army (DGIS) · Theme: Blockchain & Cybersecurity

[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11+-blue)](pyproject.toml)
[![Air-gapped](https://img.shields.io/badge/network-none%20required-success)](#air-gap)

</div>

> *`pramāṇa` (प्रमाण) — in Indian epistemology, the means by which valid knowledge is obtained.
> Not the claim. The instrument that makes the claim trustworthy.*

---

## The one thing to read first

> **A hash proves the bytes didn't change. It cannot tell you the model was born backdoored.**

A contractor who poisons 0.5% of their own annotation shard produces a model whose every
hash is valid, whose every signature verifies, and whose ledger is pristine — and which
misclassifies a specific vehicle as civilian whenever a particular patch appears in frame.

Cryptographic integrity is a **necessary substrate and a wholly inadequate answer.** It
secures the channel and leaves the source unexamined.

> In a multi-contributor pipeline, the adversary is not in the network.
> The adversary is **on the vendor list.** You cannot defend against a
> supplier by verifying the delivery.

PRAMANA assesses a defence CV model *behaviourally* — what the artefact that will actually
**run** does, at the precision it will run at — and states every result in the units the
contract already uses.

---

## Quick start

```bash
git clone <this-repo> && cd pramana
pip install -e ".[ml,api,dev]"
python scripts/make_fixtures.py
```

Then, in order of how quickly they convince you:

```bash
pramana selftest
```

```bash
pramana demo
```

```bash
pramana report validate examples/report.example.json
```

Everything above runs **with the network cable out**. That is not a nice property; it is
clause 2.2.6, and CI runs with networking disabled to keep it true.

---

## What it does

| Step | What PRAMANA states | About which object | At what strength |
|---|---|---|---|
| **Assess** | Whether the **converted** artefact diverges from its own other rungs, on a pre-committed battery, against a fitted null | The delivered artefact and its conversions | Empirical *p* against a printed floor (1/65 at *n*=64) |
| **Attribute** | A supplier verdict gated by `evidence_strength`, under a **declared FDR over the whole supplier list** | Lots in the training corpus | Mechanisms published; the FDR framing is what we found unoccupied |
| **Denominate** | Verdicts, monitoring epochs and unassessed remainder carried in **contract objects** — lot, delivery, re-let, clause | The contract | An argument about units, with a pre-registered falsifier |
| **Measure concentration** | `certified_floor_k` — how many compromised **contributors** a partition vote tolerates — beside the **volume share** those *k* lots hold | **An ensemble we build for the measurement. Never the fielded model** | Never evidence about the artefact that ships |
| **Contain** | Removal, then a trigger-amplitude sweep against our own cleaned model | The delivered artefact | Empirical, not certified |

**Row 3 is the pitch. The rest is the entry fee.**

---

## The central idea, in one paragraph

Every certified poisoning defence in the literature bounds robustness in units of
*poisoned samples*. A procurement authority signs contracts with *suppliers*. So PRAMANA
partitions the corpus along **contract-lot** boundaries and measures the guarantee in the
unit the contract is written in. Three hostile prior-art sweeps produced the same result
three times: **every claim that named a mechanism got weaker, and every claim that named
a unit of account got stronger.**

> We did not invent a detector. We found that this field measures everything in units a
> programme office cannot sign a contract in, and we rebuilt the reporting layer in the
> units it can.

---

## Architecture

```
PRE-COMMITMENT (G1) — committed BEFORE the artefact is received
  battery A digest (published) · battery B digest (sealed) · taxonomy · thresholds · seed
        │
CONTRIBUTORS  lot 1..m  ──signed shards, Ed25519──▶  C1 ADMISSION GATE (G3)
        │                      read-only custody · signed training manifest
        ▼
┌─ T1 SPINE ──────────── no gradients, no retraining, minutes ──────────────┐
│  C3.a  PRECISION LADDER  fp32▸fp16▸int8▸pruned▸onnx▸torchscript      [D1] │
│        probes ▶ logit matrix per rung ▶ cross-rung divergence             │
│        ▶ standardised against the FAMILY CLEAN NULL (never a paired twin) │
│  C3.b  TRIGGER REVERSAL  patch-L1 │ blend-L∞ │ DCT band, BH-corrected     │
│  C3.d  PARAMETER / ACTIVATION STATISTICS                                  │
│  C6′   RECEIPT-STREAM e-PROCESS  anytime-valid, no labels            [D3] │
└───────────────────────────────────────────────────────────────────────────┘
┌─ T2  (A2 — dataset access) ───────────────────────────────────────────────┐
│  C2′  four data-side detectors ▶ per-source e-values ▶ e-BH          [D3] │
│  C8   provenance-aligned partition ▶ Run-Off Election                [D2] │
│  C9   drift vs manipulation: CONTRIBUTOR concentration                    │
└───────────────────────────────────────────────────────────────────────────┘
┌─ T3  (A3 — full pipeline) ────────────────────────────────────────────────┐
│  C4   attribution S1▸S2▸S3 leave-lot-out (5 seeds + size-matched control) │
│  C5   containment + amplitude sweep                                       │
└───────────────────────────────────────────────────────────────────────────┘
        ▼
EVIDENCE ASSEMBLY (G5) → DISPOSITION LATTICE (G2) → SIGNED REPORT
                                                   + HASH-CHAINED LEDGER
                                                   + EXTERNAL ANCHOR
```

**Read one thing off it:** the T1 spine alone satisfies clauses 2.2.2, 2.2.3 and 2.2.6
with no gradients, no retraining and no dataset. Everything below degrades away as access
narrows, and says so in a field.

---

## Verify it yourself in under a minute

These are the checks a sceptical reviewer can run on the spot. They are the reason to
believe the rest.

| Check | Command | What it proves |
|---|---|---|
| Report arithmetic | `pramana report validate <file>` | Six mandated comparator pairs. A number without the thing that bounds it does not ship |
| Coverage is generated | delete a class from `taxonomy.yaml`, then `pramana coverage check` | **The build fails.** If we forgot an attack class, CI tells us, not a judge |
| Ledger tamper-evidence | `pramana demo --beat tamper` | Local chain verification fails at the named row |
| External anchor | `pramana demo --beat anchor` | An insider with our keys rewrites a verdict, the **local chain still verifies**, and the external check fails anyway |
| Format conformance | `pramana selftest` | COCO/YOLO/ONNX/TorchScript load — **and the malformed fixtures are rejected** |
| Licence hygiene | `make licence-check` | No `-NC`, SSPL or unknown licence in the dependency tree |

---

## The six comparator pairs

The single rule that generated most of this codebase:

> **A number is not checkable unless the report also prints the thing it must be checked
> against.**

| # | The number | Printed beside |
|---|---|---|
| 1 | `detection_p` | its floor, `1/(n+1)` = 0.01538 at *n* = 64 |
| 2 | localisation *p* | `bh_critical_value_at_rank_1` = α/43 = 0.00116 |
| 3 | coverage counts | `sum_check` and `total_classes` |
| 4 | `e_value_merged` | `ebh_threshold_at_k1` = *m*/(α·k) = 240 at *m* = 12 |
| 5 | null transfer delta | the declared transfer ceiling, with a bootstrap interval |
| 6 | `certified_floor_k` | `volume_share_of_largest_k` — because 3 of 12 lots can be 51% of the corpus |

The validator parses **every fenced block whose body begins `{` or `[`**, regardless of
its language tag — because the block that ships untagged is exactly the one a tag-keyed
check skips.

---

## What we do not claim

This list is short on purpose, it is in the repository rather than an appendix, and none
of it is closed by more work.

- **Certified robustness is a property of ensembles, not of single deployed models.**
  `certified_floor_k` describes an ensemble we build for the measurement. It never
  becomes evidence about the artefact that ships, however many rungs the ladder clears.
- **No efficient black-box behavioural test detects a backdoor planted to be
  undetectable by construction** — [arXiv:2204.06974](https://arxiv.org/abs/2204.06974),
  a theorem, not a gap in our engineering. So no output here ever says a model is clean.
  A verdict takes exactly one form: *no evidence of conditional misbehaviour was found
  under battery {digest} at rungs {list}, against null {family, corpus, converter}*.
- **The unit-of-account thesis is an argument about units**, and experiment E11 is its
  only falsifier. If the acquisition decision is identical in sample units and contract
  units across six written scenarios, the claim is withdrawn rather than argued.
- **Battery A is published**, so an adaptive vendor can tune to it. Battery B is sealed
  and single-use, and its custody is an *organisational* control, labelled as such.
- **Every mechanism here is prior art.** Trigger reversal is Neural Cleanse. Cross-
  precision testing is DiffChaser and DiverGet. Contributor-denominated certification is
  FLCert. Sequential monitoring is Vovk and WATCH. Machine-readable assurance is AMLAS
  and the Evidential Tool Bus. The contribution is the record discipline around them.
- **The concentration operating point is not measured.** Until E10 runs, it is tagged
  `predicted` in every report and no disposition rests on it alone.
- **No patent search has been performed.** For an instrument intended for procurement
  that is a real gap, not a rounding error. Every originality statement therefore takes
  the form *"we found no work that does X"*, never *"no work exists"*.

---

## Open source

PRAMANA is **Apache-2.0**, and the choice is deliberate rather than conventional: we have
not completed a patent search and a known vendor in this space states it holds granted
patents, so the express patent grant and defensive termination in Apache §3 matter in a
way MIT's silence does not.

Two dependency decisions worth stating:

- **Valkey, not Redis.** Redis left BSD-3 in March 2024 and is now tri-licensed
  AGPLv3/SSPLv1/RSALv2. We will not put a source-available dependency inside a defence
  assurance instrument, and Valkey is a BSD-3 drop-in under Linux Foundation governance.
- **BackdoorBench is used and not shipped.** It is CC BY-NC-4.0 — NonCommercial, which
  is not an open-source licence. It lives in `research/`, excluded from the Docker image
  and from `offline-manifest.yaml`, and is used only to cross-check our own attack
  implementations. The attacks that ship are ours, written from the original papers.

Enforced rather than asserted: CI fails the build if a `-NC`, SSPL or unknown licence
enters the dependency tree, `reuse lint` fails it if any file lacks an SPDX header, and
the AI bill of materials is generated in CycloneDX rather than written by hand.

> **An assurance tool that cannot produce its own bill of materials has no standing to
> demand one.**

---

## Air gap

Clause 2.2.6 mandates offline operation and every tool in this stack violates it by
default: `pip install` reaches out, `pretrained=True` downloads weights, dataset loaders
fetch archives. "The internet, at runtime" is not an admissible answer to *where did
those weights come from?*

| Requirement | How |
|---|---|
| Offline dependency manifest | `offline-manifest.yaml` — every wheel, weight, dataset and fixture with SHA-256, size, upstream URL, licence and staging date. `pramana verify-offline` recomputes every digest before an assessment runs |
| No pretrained downloads | The OOD/feature backbone is **trained in-house** on a declared public corpus, entered in the manifest and signed. A PRAMANA artefact with provenance, not an opaque download |
| Network-disabled CI | The full suite runs with networking disabled. Any egress attempt fails the build |
| Pinned everything | Exact versions, hash-checked installs from a local wheelhouse, images pinned **by digest** and exported to tar |
| Determinism | Seeds, `cudnn.deterministic`, a recorded environment digest per assessment |

---

## Repository layout

```
pramana/          the core package — ships
  ingest/         COCO · YOLO · ONNX · TorchScript + conformance selftest
  ladder/         precision ladder, divergence, concentration, fitted null   [D1]
  reversal/       trigger reversal + fake-quant surrogate and its gate
  detectors/      four data-side detectors (clause 2.2.1)
  aggregate/      e-values, weighted arithmetic-mean merge, e-BH             [D3]
  partition/      contract lots, Run-Off Election, volume inequality         [D2]
  drift/          drift-vs-manipulation discriminators
  ledger/         hash chain, Ed25519, external anchor                       [G1]
  receipts/       signed inference receipts + anytime-valid e-process
  disposition/    five-state lattice, named conditional release              [G2]
  coverage/       generated coverage; a missing class fails the build        [G5]
  report/         schema, emitter, validator (six comparator pairs)
api/              FastAPI
worker/           async job runner (reversal is slow)
console/          Next.js — the analyst console, five screens
web/              Next.js — public site: case files, in-browser ledger verification (Firebase Hosting)
gates/            build gates: forbidden phrases, banners, mutation test
conformance/      fixtures, including deliberately malformed ones
experiments/      E1′ · E2 · E4 · E10 · E11 · E13
research/         DOES NOT SHIP — CC BY-NC material lives here
```

---

## Documentation

| Document | What it is |
|---|---|
| `PRAMANA-SIH26228 (1).md` | The technical design record: threat model, claims at stated strength, prior art, experiment plan, and 138 defects we found in our own design |
| `PRAMANA-SELECTION-CASE.md` | Compliance map, government investment case, impact and SDGs, business model |
| `PRAMANA-BUILD-REQUIREMENTS.md` | Datasets with sizes and licences, disk and GPU budgets, the ten-week plan |
| `docs/` | Schema reference, air-gap install, demo script |

---

## Licence

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE). Third-party licences in
[`LICENSES/`](LICENSES/); the generated bill of materials is produced by
`make sbom`.
