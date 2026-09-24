"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { dt, humanise, short } from "@/lib/format";
import { ed25519Supported, insiderRewrite, naiveTamper, verifyChain, type ChainCheck } from "@/lib/ledger";
import type { CaseFile, LedgerRow } from "@/lib/types";
import { Icon, Pill } from "../ui";
import type { BlockState } from "../three/ChainScene";

const ChainScene = dynamic(() => import("../three/ChainScene"), { ssr: false, loading: () => <div className="h-full w-full animate-pulse rounded-xl bg-canvas" /> });

type Mode = "original" | "outsider" | "insider";

export function LedgerPanel({ c, compact = false }: { c: CaseFile; compact?: boolean }) {
  const [rows, setRows] = useState<LedgerRow[]>(c.ledger.rows);
  const [mode, setMode] = useState<Mode>("original");
  const [check, setCheck] = useState<ChainCheck | null>(null);
  const [revealed, setRevealed] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [ed, setEd] = useState<boolean | null>(null);
  const target = c.ledger.insider_rewrite.row;
  const upto = c.ledger.anchor_upto;

  useEffect(() => {
    ed25519Supported().then(setEd);
  }, []);

  async function run(nextRows: LedgerRow[], nextMode: Mode) {
    setBusy(true);
    setRows(nextRows);
    setMode(nextMode);
    setCheck(null);
    setRevealed(-1);
    // the insider re-signs from the rewritten row on with keys a browser does not hold
    const res = await verifyChain(nextRows, c.ledger.public_keys, nextMode === "insider" ? { skipSignaturesFrom: target } : {});
    const anchorRes = await verifyChain(nextRows, c.ledger.public_keys, { upto, skipSignatures: true });
    setCheck({ ...res, root: anchorRes.root });
    for (let i = 0; i < nextRows.length; i++) {
      await new Promise((r) => setTimeout(r, 55));
      setRevealed(i);
    }
    setBusy(false);
  }

  const anchorMatch = check ? check.root === c.ledger.anchored_root : null;
  const blockStates: BlockState[] = useMemo(
    () =>
      rows.map((_, i) => {
        if (!check || i > revealed) return "idle";
        if (mode === "insider" && i >= target) return "rewritten";
        const r = check.rows[i];
        if (!r) return "idle";
        return r.linkOk && r.hashOk && r.sigOk !== false ? "ok" : "broken";
      }),
    [rows, check, revealed, mode, target],
  );
  const done = check && revealed >= rows.length - 1;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.05fr_1fr]">
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div>
            <div className="text-[14px] font-medium">Re-verify in this browser</div>
            <div className="text-[12px] text-muted">SHA-256 chain · Merkle root · Ed25519 via Web Crypto — nothing trusted from the server</div>
          </div>
          {done && (
            <Pill tone={check!.ok ? "ok" : "crit"} dot>
              {check!.ok ? `chain verifies · ${rows.length} rows` : `broken at row ${check!.brokenAt}`}
            </Pill>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-b border-line px-5 py-3">
          <button className="btn-primary !px-3.5 !py-2 !text-[13px]" disabled={busy} onClick={() => run(c.ledger.rows, "original")}>
            <Icon.Shield size={15} /> Verify ledger
          </button>
          <button className="btn-ghost !px-3.5 !py-2 !text-[13px]" disabled={busy} onClick={() => run(naiveTamper(c.ledger.rows, target, { disposition: "ACCEPT" }), "outsider")}>
            Edit row {target} as an outsider
          </button>
          <button
            className="btn-ghost !px-3.5 !py-2 !text-[13px]"
            disabled={busy}
            onClick={async () => run(await insiderRewrite(c.ledger.rows, target, { disposition: "ACCEPT" }), "insider")}
          >
            Rewrite history as an insider
          </button>
          {mode !== "original" && (
            <button className="px-2 text-[13px] text-muted hover:text-ink" disabled={busy} onClick={() => run(c.ledger.rows, "original")}>
              Reset
            </button>
          )}
        </div>

        <div className={`scrollbar-thin overflow-auto ${compact ? "max-h-[300px]" : "max-h-[420px]"}`}>
          <table className="w-full min-w-[560px] text-left text-[12px]">
            <thead className="sticky top-0 z-10 bg-surface font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              <tr className="border-b border-line">
                <th className="px-5 py-2 font-normal">#</th>
                <th className="py-2 font-normal">Event</th>
                <th className="py-2 font-normal">Signer</th>
                <th className="py-2 font-normal">Entry hash</th>
                <th className="py-2 pr-5 text-right font-normal">Check</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const rc = check?.rows[i];
                const shown = check && i <= revealed;
                const changed = mode !== "original" && i === target;
                const rewritten = mode === "insider" && i >= target;
                const bad = shown && rc && (!rc.linkOk || !rc.hashOk || rc.sigOk === false);
                return (
                  <tr key={i} className={`border-b border-line/70 ${bad ? "bg-crit-50" : rewritten && shown ? "bg-warn-50" : ""} ${i === upto ? "border-b-2 border-b-brand/40" : ""}`}>
                    <td className="px-5 py-2 font-mono text-muted">{i}</td>
                    <td className="py-2">
                      <div className="font-medium text-ink">{humanise(r.event_type)}</div>
                      <div className="font-mono text-[10.5px] text-muted">
                        {dt(r.timestamp_utc)}
                        {changed && <span className="ml-2 text-crit">payload.disposition → ACCEPT</span>}
                      </div>
                    </td>
                    <td className="py-2 font-mono text-[11px] text-ink-2">{r.signer_id}</td>
                    <td className="py-2 font-mono text-[11px] text-ink-2" title={r.entry_hash}>
                      {short(r.entry_hash, 8, 4)}
                    </td>
                    <td className="py-2 pr-5 text-right">
                      {!shown ? (
                        <span className="font-mono text-[11px] text-muted">·</span>
                      ) : bad ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-crit">
                          <Icon.X size={13} /> {!rc!.hashOk ? "hash" : !rc!.linkOk ? "link" : "sig"}
                        </span>
                      ) : rewritten ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-warn">
                          <Icon.Check size={13} /> re-signed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-ok">
                          <Icon.Check size={13} /> {rc!.sigOk === null ? "hash" : "hash·sig"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {ed === false && (
          <div className="border-t border-line px-5 py-2.5 text-[11.5px] text-muted">
            This browser does not expose Ed25519 in Web Crypto, so signatures were not re-checked here; hashes, links and the Merkle root were.
          </div>
        )}
      </div>

      <div className="card flex flex-col overflow-hidden">
        <div className="relative h-[260px] border-b border-line bg-gradient-to-b from-brand-50/60 to-surface sm:h-[300px]">
          <ChainScene className="absolute inset-0" states={blockStates} anchorUpto={upto} anchor={done && mode !== "outsider" ? (anchorMatch ? "ok" : "fail") : "idle"} />
        </div>
        <div className="grid gap-3 p-5">
          <Row label="Local chain" ok={done ? check!.ok : null} okText="verifies" badText={`fails at row ${check?.brokenAt}`} />
          <Row
            label="External anchor"
            ok={done && mode !== "outsider" ? anchorMatch : null}
            okText="root matches token"
            badText="root does not match token"
            idle={mode === "outsider" && done ? "not needed — local check already failed" : undefined}
          />
          <div className="rounded-xl border border-line bg-canvas p-3 font-mono text-[11px] leading-relaxed text-ink-2">
            <div>
              <span className="text-muted">anchored root </span>
              {short(c.ledger.anchored_root, 12, 6)}
            </div>
            <div>
              <span className="text-muted">recomputed    </span>
              <span className={done && !anchorMatch ? "text-crit" : ""}>{check ? short(check.root, 12, 6) : "—"}</span>
            </div>
            <div>
              <span className="text-muted">token digest  </span>
              {short(c.ledger.token_digest, 12, 6)}
            </div>
          </div>
          <p className="text-[12.5px] leading-relaxed text-ink-2">
            {mode === "insider" && done
              ? "An insider holding the signing keys re-hashed and re-signed every later row. The local chain is internally consistent and verifies — nothing inside the instrument can tell. The anchored Merkle root no longer matches, on a digest held by a party we cannot reach."
              : mode === "outsider" && done
                ? "Changing a payload without the keys leaves a stale hash: local verification fails at exactly the edited row."
                : "Every act — battery commitment, lot admission, verdict, risk acceptance, revocation — is a signed row linked to the one before it. The Merkle root over those rows is anchored outside the certifying authority."}
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, ok, okText, badText, idle }: { label: string; ok: boolean | null; okText: string; badText: string; idle?: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-line px-3.5 py-2.5">
      <span className="text-[13px] text-ink-2">{label}</span>
      {ok === null ? (
        <span className="font-mono text-[11px] text-muted">{idle ?? "not yet checked"}</span>
      ) : ok ? (
        <Pill tone="ok">
          <Icon.Check size={12} /> {okText}
        </Pill>
      ) : (
        <Pill tone="crit">
          <Icon.X size={12} /> {badText}
        </Pill>
      )}
    </div>
  );
}
