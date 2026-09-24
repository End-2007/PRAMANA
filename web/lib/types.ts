/**
 * Shape of a case file bundle, as written by scripts/build_casefiles.py.
 * Every number the results screens show comes from one of these files.
 */

export interface LadderRung {
  rung: string;
  pair: string;
  mean_divergence?: number;
  probes_diverging?: number;
  accuracy?: number | null;
  p?: number | null;
  p_is_floor?: boolean;
  p_floor?: number;
  null_population?: string | null;
  null_median?: number;
  null_q95?: number;
  null_draws?: number[];
  fires?: boolean;
  robust_z?: number;
  unavailable?: boolean;
  note?: string;
}

export interface Lot {
  lot_id: string;
  vendor: string;
  po: string;
  n_samples: number;
  share: number;
  shard_digest: string;
  e_merged: number;
  rejected: boolean;
  e_detectors: Record<string, number>;
}

export interface GalleryItem {
  probe: number;
  img: string;
  truth: number;
  fp32: number;
  fp32_conf: number;
  int8: number;
  int8_conf: number;
}

export interface LedgerRow {
  index: number;
  timestamp_utc: string;
  event_type: string;
  payload: Record<string, unknown>;
  prev_hash: string;
  entry_hash: string;
  signer_id: string;
  signature: string;
}

export interface TimelineEntry {
  at: string;
  state: string;
  by: string;
  note: string;
  controls?: string[];
}

export interface CaseFile {
  id: string;
  report_id: string;
  delivery: string;
  title: string;
  summary: string;
  programme: string;
  seeded: boolean;
  red_team: { target_class: number; lot: string; probes_armed: number; armed_at: string } | null;
  access: { tier: string; access_tier: string; turnaround_s: { triage: number; full: number } };
  artefact: {
    family: string;
    corpus: string;
    classes: number;
    params: string;
    accuracy: Record<string, number>;
    accuracy_basis: Record<string, string>;
    converter: string;
    scale_table_digest: string;
    recipe_digest: string;
    int8_reproduced: boolean;
    builds: { rung: string; format: string; digest: string; signer: string; role: string; certified?: boolean }[];
  };
  battery: {
    a_digest: string;
    b_digest: string;
    generation: number;
    probes: number;
    calibration_digest: string;
    calibration_images: number;
    committed_at: string;
    received_at: string;
  };
  lots: Lot[];
  ladder: {
    rungs: LadderRung[];
    int8: {
      mean_divergence: number;
      p: number;
      p_is_floor: boolean;
      p_floor: number;
      fires: boolean;
      probes_diverging: number;
      per_class: number[];
      gini: number;
      classes_at_90: number;
      dominant_class: number | null;
      dominant_share: number;
      condition_met: boolean;
      interpretation: string;
      operating_point: { gini: number; max_classes: number; status: string };
    };
    benign_gini: number[];
    benign_classes_at_90: number[];
    null: { population: string; n: number; floor: number; family: string; corpus: string; converter: string; median: number; iqr: number };
  };
  localisation: {
    gated: boolean;
    classes_tested: number;
    critical_value_at_rank_1: number;
    p_floor: number;
    pooled_draws: number;
    p?: number[];
    share?: number[];
    rejected?: number[];
    note?: string;
  };
  gallery: GalleryItem[];
  contributors: {
    weights: Record<string, number>;
    weights_digest: string;
    threshold_k1: number;
    fdr: number;
    rejections: string[];
    audited_per_lot: number;
  };
  certificate: {
    m: number;
    k: number;
    coverage: number;
    certified_fraction: number;
    curve: [number, number][];
    volume_share_of_largest_k: number;
    largest_single_share: number;
    ensemble_acc: number;
    surrogate_gap: number;
    lot_model_accuracy: number[];
    eval_images: number;
    poisoned_lot_attack_success: number | null;
    scope_note: string;
  };
  drift: {
    verdict: string;
    primary_discriminator: string;
    discriminator_scores: Record<string, number>;
    corroborating: Record<string, number>;
    verdict_note: string;
  };
  disposition: {
    final: string;
    base: string;
    rationale: string;
    timeline: TimelineEntry[];
    verdict_statement: string;
    authority: { name: string; role: string } | null;
  };
  monitor: {
    alpha: number;
    threshold: number;
    n: number;
    crossed: boolean;
    crossing_index: number | null;
    onset: number | null;
    max_log10_e: number;
    e_at_crossing: number | null;
    halted_at: number | null;
    trace: [number, number][];
    receipts_verified: boolean;
    receipts_checked: number;
    receipt_sample: Record<string, unknown>[];
  };
  ledger: {
    rows: LedgerRow[];
    anchor_upto: number;
    anchored_root: string;
    token_digest: string;
    local_verifies: boolean;
    insider_rewrite: { row: number; local_verifies: boolean; anchor_matches: boolean };
    public_keys: Record<string, string>;
  };
  coverage: {
    total: number;
    assessed: number;
    declared_unsupported: number;
    not_assessed: number;
    sum_check: number;
    items: { id: string; disposition: string; reason: string | null; mechanisms: string[] }[];
  };
  validation: { ok: boolean; pairs_checked: number; blocks_checked: number; violations: unknown[] };
  report_url: string;
  ledger_url: string;
  provenance: { measured: string[]; seeded: string[]; modelled: string[] };
}

export interface Calibration {
  arms: Record<
    string,
    { population: string; n: number; floor: number; median: number; iqr: number; draws: number[]; family: string; corpus: string; benign_gini_median: number }
  >;
  transfer: {
    null_corpus_transfer_delta: { contrast: string; median_shift_over_iqr: number; bootstrap_ci_median_shift: [number, number] };
    null_family_transfer_delta: { contrast: string; median_shift_over_iqr: number; bootstrap_ci_median_shift: [number, number] };
    transfer_ceiling: number;
    corpus_exceeds_ceiling: boolean;
    family_exceeds_ceiling: boolean;
  };
  models: number;
  gpu_hours: number;
  gpu: string;
  torch: string;
  below_acc_floor: number;
  operational_acc_median: number;
  operational_acc_min: number;
}
