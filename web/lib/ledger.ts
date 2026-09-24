/**
 * The ledger, re-verified in the viewer's own browser.
 *
 * Mirrors pramana/ledger/chain.py exactly: an entry hash is SHA-256 over the canonical
 * JSON (sorted keys, no whitespace) of {index, timestamp_utc, event_type, payload,
 * prev_hash}; the signature is Ed25519 over the entry hash's UTF-8 bytes; the Merkle
 * root pairs "sha256:<hex>" strings and duplicates the last leaf on odd levels.
 * Nothing here trusts the server -- that is the point of doing it client-side.
 */

import type { LedgerRow } from "./types";

export const GENESIS = "sha256:" + "0".repeat(64);

export function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`).join(",")}}`;
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return "sha256:" + Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function entryHash(row: Pick<LedgerRow, "index" | "timestamp_utc" | "event_type" | "payload" | "prev_hash">): Promise<string> {
  return sha256(
    canonical({
      index: row.index,
      timestamp_utc: row.timestamp_utc,
      event_type: row.event_type,
      payload: row.payload,
      prev_hash: row.prev_hash,
    }),
  );
}

export async function merkleRoot(leaves: string[]): Promise<string> {
  if (!leaves.length) return GENESIS;
  let level = [...leaves];
  while (level.length > 1) {
    if (level.length % 2) level.push(level[level.length - 1]);
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) next.push(await sha256(level[i] + level[i + 1]));
    level = next;
  }
  return level[0];
}

function b64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

let edSupport: Promise<boolean> | null = null;
export function ed25519Supported(): Promise<boolean> {
  if (!edSupport) {
    edSupport = (async () => {
      try {
        await crypto.subtle.importKey("raw", new Uint8Array(32), { name: "Ed25519" }, false, ["verify"]);
        return true;
      } catch {
        return false;
      }
    })();
  }
  return edSupport;
}

export async function verifySignature(publicKeyB64: string, message: string, signatureB64: string): Promise<boolean | null> {
  if (!(await ed25519Supported())) return null;
  try {
    const key = await crypto.subtle.importKey("raw", b64(publicKeyB64) as BufferSource, { name: "Ed25519" }, false, ["verify"]);
    return await crypto.subtle.verify({ name: "Ed25519" }, key, b64(signatureB64) as BufferSource, new TextEncoder().encode(message));
  } catch {
    return false;
  }
}

export type RowCheck = {
  index: number;
  linkOk: boolean;
  hashOk: boolean;
  sigOk: boolean | null;
};

export interface ChainCheck {
  rows: RowCheck[];
  ok: boolean;
  brokenAt: number | null;
  root: string;
}

export async function verifyChain(
  rows: LedgerRow[],
  keys: Record<string, string>,
  opts: { upto?: number; skipSignatures?: boolean; skipSignaturesFrom?: number } = {},
): Promise<ChainCheck> {
  const { upto, skipSignatures, skipSignaturesFrom } = opts;
  const last = upto ?? rows.length - 1;
  const checks: RowCheck[] = [];
  let prev = GENESIS;
  let brokenAt: number | null = null;
  for (let i = 0; i <= last; i++) {
    const r = rows[i];
    const linkOk = r.prev_hash === prev && r.index === i;
    const hashOk = (await entryHash(r)) === r.entry_hash;
    const pk = keys[r.signer_id];
    const skip = skipSignatures || (skipSignaturesFrom !== undefined && i >= skipSignaturesFrom);
    const sigOk = skip ? null : pk ? await verifySignature(pk, r.entry_hash, r.signature) : false;
    checks.push({ index: i, linkOk, hashOk, sigOk });
    if (brokenAt === null && (!linkOk || !hashOk || sigOk === false)) brokenAt = i;
    prev = r.entry_hash;
  }
  const root = await merkleRoot(rows.slice(0, last + 1).map((r) => r.entry_hash));
  return { rows: checks, ok: brokenAt === null, brokenAt, root };
}

/** The clumsy outsider: change a payload, leave the stale hash. */
export function naiveTamper(rows: LedgerRow[], index: number, patch: Record<string, unknown>): LedgerRow[] {
  return rows.map((r) => (r.index === index ? { ...r, payload: { ...r.payload, ...patch } } : r));
}

/**
 * The insider who holds the keys (adversary A7): rewrite, re-hash and re-chain every
 * later row. Re-signing needs the private key, which a browser does not have -- so the
 * signatures are marked as re-signed by the insider rather than faked.
 */
export async function insiderRewrite(rows: LedgerRow[], index: number, patch: Record<string, unknown>): Promise<LedgerRow[]> {
  const out = rows.map((r) => ({ ...r, payload: { ...r.payload } }));
  let prev = index === 0 ? GENESIS : out[index - 1].entry_hash;
  for (let i = index; i < out.length; i++) {
    const r = out[i];
    if (i === index) r.payload = { ...r.payload, ...patch };
    r.prev_hash = prev;
    r.entry_hash = await entryHash(r);
    r.signature = "insider-resigned";
    prev = r.entry_hash;
  }
  return out;
}
