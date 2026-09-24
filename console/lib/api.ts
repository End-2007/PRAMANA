/**
 * Typed access to the PRAMANA API.
 *
 * One rule governs this file and every component that uses it:
 * a number never reaches the screen without the thing that bounds it.
 * The API serves the bounds alongside the values for exactly that reason,
 * and `Pair` below is the shape the UI renders them in.
 */

export const API_BASE = process.env.NEXT_PUBLIC_PRAMANA_API ?? "";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

/** A value and the thing it must be checked against. Never render one without the other. */
export interface Pair {
  label: string;
  value: string | number;
  comparator: string;
  comparatorValue: string | number;
  ok?: boolean;
  note?: string;
}

export interface Constants {
  n_null_operational: number;
  n_classes_operational: number;
  p_floor_l1_detection: number;
  p_floor_l1_basis: string;
  p_floor_l2_localisation: number;
  p_floor_l2_basis: string;
  bh_critical_value_at_rank_1: number;
  declared_fdr: number;
  transfer_ceiling: number;
  single_lot_majority_threshold: number;
  concentration_operating_point: {
    gini: number;
    max_classes: number;
    status: string;
    note: string;
  };
  verdict_template: string;
}

export interface FingerprintDivergence {
  pair: string;
  probes_diverging: number;
  probes_total: number;
  level: string;
  detection_p: number;
  detection_p_reported_as: string;
  detection_p_is_floor: boolean;
  detection_p_basis: string;
  detection_fires: boolean;
  null_family: string;
  null_corpus: string;
  null_population: string;
  divergence_concentration_gini: number;
  divergence_concentration_classes: number;
  dominant_class: number | null;
  concentration_operating_point: string;
  concentration_operating_point_status: "predicted" | "measured";
  concentration_operating_point_source: string;
  concentration_condition_met: boolean;
  interpretation: string;
}

export interface Report {
  report_id: string;
  document_status: "ILLUSTRATIVE_EXAMPLE" | "MEASUREMENT_RECORD";
  document_status_note: string | null;
  generated_at_utc: string;
  verdict_statement: string;
  assessment: {
    tier: string;
    access_tier: string;
    build_state: string;
    turnaround_s: Record<string, number>;
  };
  battery: {
    generation: number;
    battery_a_digest: string;
    battery_b_digest: string;
    committed_before_artefact_receipt: boolean;
    committed_at_utc: string;
    battery_custody: {
      digest_custodian: string;
      material_custodian: string;
      assessing_team: string;
      custodians_distinct: boolean;
      control_type: string;
      defeats: string[];
      does_not_defeat: string[];
    };
  };
  null_calibration: {
    null_family: string;
    null_corpus: string;
    null_population: string;
    arms: { arm: string; n: number; role: string }[];
    p_floors: Record<string, string | number>;
    null_corpus_transfer_delta: TransferDelta | null;
    null_family_transfer_delta: TransferDelta | null;
    transfer_ceiling: {
      max_median_shift_over_iqr_permitted: number;
      family_delta_exceeds_ceiling: boolean;
      affects_this_report: boolean;
      consequence_recorded: string;
    } | null;
  };
  artefact: {
    logical_model_id: string;
    family: string;
    builds: {
      rung: string;
      format: string;
      digest: string;
      signer: string;
      role: string | null;
      certified: boolean;
      conversion: {
        quantiser: string;
        calibration_set_digest: string | null;
        scale_table_digest: string | null;
      } | null;
    }[];
  };
  precision_ladder: {
    rungs_assessed: string[];
    rungs_declared_unavailable: string[];
    fingerprint_divergence: FingerprintDivergence[];
    converter_provenance: {
      certified_rung: string;
      recorded_not_certified_rungs: string[];
      shared_scale_table: boolean | null;
      note: string | null;
      vendor_vs_integrator: {
        probes_diverging: number;
        probes_total: number;
        divergence_p: number;
        divergence_p_floor: number;
        exceeds_null: boolean;
      } | null;
    } | null;
  };
  findings: Finding[];
  supplier_concentration_measurement: SupplierConcentration | null;
  drift_assessment: {
    axes: {
      axis: string;
      status: string;
      drift_realism: string;
      reason: string | null;
      score: number | null;
      score_basis: string | null;
    }[];
    primary_discriminator: string;
    verdict: string | null;
    verdict_note: string | null;
  } | null;
  coverage: Coverage;
  disposition: DispositionRecord;
  assurance_debt: {
    items: DebtItem[];
    by_owner_class: Record<string, Record<string, number>>;
    grand_total: string;
  };
  external_anchor: {
    anchor_procedure: string;
    anchor_type: string;
    anchor_state: string;
    merkle_root: string | null;
    anchor_lag_s: number | null;
    token_digest: string | null;
    note: string;
  };
  declared_assumptions: string[];
  assessment_unavailable: Record<string, string | null>[];
}

export interface TransferDelta {
  contrast: string;
  factor: string;
  median_shift_over_iqr: number;
  bootstrap_ci_median_shift: [number, number];
  alpha_tail_shift_over_iqr: number | null;
  quantile_resolution: string;
}

export interface Finding {
  finding_id: string;
  mechanism: string;
  reason_code: string;
  affected_asset: string;
  rung: string | null;
  contributor: string | null;
  statistic: Record<string, unknown> & { name: string; value: number };
  evidence: { kind: string; digest: string | null; detail: string | null }[];
  attribution_mode: "point" | "set_valued";
  attribution_set: string[];
  attribution_set_size: number;
  containment_scope: string[];
  attribution_note: string | null;
  evidence_strength: string;
  corroborating_mechanisms: string[];
  note: string | null;
}

export interface SupplierConcentration {
  scope: string;
  scope_note: string;
  partition_basis: string;
  m_lots: number;
  aggregator: string;
  certified_floor_k: number | null;
  certified_floor_k_entities: number | null;
  certified_fraction_at_k: number | null;
  surrogate_gap_top1: number | null;
  certificate_scope_degenerate: string | null;
  entity_map_incomplete: string | null;
  volume_inequality: {
    lot_volume_shares: Record<string, number>;
    shares_sum_check: number;
    largest_single_share: number;
    volume_share_of_largest_k: number;
    k_is_a_count_not_a_volume: boolean;
  } | null;
}

export interface Coverage {
  taxonomy_digest: string;
  taxonomy_generation: number;
  assessed: number;
  declared_unsupported: number;
  not_assessed: number;
  total_classes: number;
  sum_check: number;
  items: {
    class_id: string;
    disposition: string;
    reason: string | null;
    mechanisms: string[];
    attribution_ceiling: string | null;
  }[];
}

export interface DispositionRecord {
  state: string;
  rationale: string;
  risk_acceptance: {
    authority_name: string;
    authority_role: string;
    accepted_at_utc: string;
    expires_at_utc: string;
    compensating_controls: string[];
    reassessment_triggers: string[];
    revoked: boolean;
    revoked_reason: string | null;
  } | null;
}

export interface DebtItem {
  debt_id: string;
  description: string;
  owner_class: string;
  magnitude: number;
  unit: string;
  retirement_condition: string;
  clause_that_would_retire_it: string | null;
  status: string;
}

export interface LedgerEntry {
  index: number;
  timestamp_utc: string;
  event_type: string;
  payload: Record<string, unknown>;
  prev_hash: string;
  entry_hash: string;
  signer_id: string;
  signature: string;
}

export interface LedgerView {
  rows: number;
  verified: boolean;
  broken_at_row: number | null;
  head: string;
  merkle_root: string;
  entries: LedgerEntry[];
}

export interface ValidationView {
  ok: boolean;
  blocks_checked: number;
  pairs_checked: number;
  violations: { rule: string; path: string; message: string }[];
  rule: string;
}

export interface SelftestView {
  total: number;
  passed: number;
  failed: number;
  ok: boolean;
  results: {
    fixture: string;
    kind: string;
    expected: string;
    actual: string;
    pass: boolean;
    detail: string;
  }[];
}

export interface DemoBeat {
  n: number;
  name: string;
  ok: boolean;
  detail: string;
  payload: Record<string, unknown>;
}

export const api = {
  constants: () => get<Constants>("/api/constants"),
  report: () => get<Report>("/api/report"),
  validate: () => get<ValidationView>("/api/report/validate"),
  coverage: () => get<Coverage>("/api/coverage"),
  ledger: () => get<LedgerView>("/api/ledger"),
  selftest: () => get<SelftestView>("/api/selftest"),
  runDemo: (clean = false) =>
    post<{ beats: DemoBeat[]; all_passed: boolean; verdict: string }>(
      `/api/demo/run?clean=${clean}`,
    ),
};

/** Abbreviate a digest for display only. Never compare on the result. */
export function shortDigest(d: string | null | undefined, head = 6, tail = 4): string {
  if (!d) return "—";
  const hex = d.startsWith("sha256:") ? d.slice(7) : d;
  if (hex.length <= head + tail) return d;
  return `sha256:${hex.slice(0, head)}…${hex.slice(-tail)}`;
}

export function pct(x: number | null | undefined, digits = 1): string {
  if (x === null || x === undefined) return "—";
  return `${(x * 100).toFixed(digits)}%`;
}
