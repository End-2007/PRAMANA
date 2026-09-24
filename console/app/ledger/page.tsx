"use client";

/**
 * Screen 4 — ledger, external anchor, and generated coverage.
 *
 * This is the screen where the evidence stops resting on our good faith. A hash chain
 * held by the certifying authority is tamper-evident *to its holder*; it is not
 * evidence *against* its holder. The external anchor is what narrows that, and the
 * panel says exactly what it does and does not buy.
 */

import { useEffect, useState } from "react";
import { api, type Coverage, type LedgerView, type Report } from "@/lib/api";
import { Badge, Digest, Empty, KV, Panel, Stat } from "@/components/ui";

export default function LedgerPage() {
  const [ledger, setLedger] = useState<LedgerView | null>(null);
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.ledger(), api.coverage(), api.report()])
      .then(([l, c, r]) => {
        setLedger(l);
        setCoverage(c);
        setReport(r);
      })
      .catch((e) => setErr(String(e)));
  }, []);

  if (err) return <Empty message={`Run "pramana demo" first. (${err})`} />;
  if (!ledger || !coverage || !report) return <Empty message="Loading ledger…" />;

  const anchor = report.external_anchor;
  const unsupported = coverage.items.filter(
    (i) => i.disposition === "declared_unsupported",
  );
  const notAssessed = coverage.items.filter((i) => i.disposition === "not_assessed");

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <Stat
          label="Chain verification"
          value={ledger.verified ? "VALID" : `BROKEN @ ${ledger.broken_at_row}`}
          comparator="rows"
          comparatorValue={ledger.rows}
          ok={ledger.verified}
        />
        <Stat
          label="External anchor"
          value={anchor.anchor_state}
          comparator="type"
          comparatorValue={anchor.anchor_type}
          ok={anchor.anchor_state === "anchored"}
          note="An anchor with an undeclared lag is an anchor whose gap an insider can sit inside."
        />
        <Stat
          label="Coverage"
          value={`${coverage.assessed} assessed`}
          comparator="sum_check"
          comparatorValue={`${coverage.sum_check} / ${coverage.total_classes}`}
          ok={coverage.sum_check === coverage.total_classes}
        />
        <Stat
          label="Declared unsupported"
          value={coverage.declared_unsupported}
          comparator="each with a reason"
          comparatorValue={unsupported.every((u) => u.reason) ? "yes" : "NO"}
          ok={unsupported.every((u) => Boolean(u.reason))}
        />
      </div>

      <Panel
        title="External anchor"
        subtitle="Trust us, or catch us — and be exact about which"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <KV k="procedure" v={anchor.anchor_procedure} />
            <KV k="type" v={anchor.anchor_type} />
            <KV k="state" v={anchor.anchor_state} />
            <KV k="merkle root" v={<Digest value={anchor.merkle_root} />} />
            <KV k="token digest" v={<Digest value={anchor.token_digest} />} />
            <KV
              k="anchor lag"
              v={anchor.anchor_lag_s !== null ? `${anchor.anchor_lag_s}s` : "—"}
            />
          </div>
          <div className="text-[11px] leading-relaxed text-muted">
            <p>{anchor.note}</p>
            <p className="mt-2">
              An insider with our keys can rewrite a verdict, re-sign every row, and the
              local chain will still verify perfectly. What they cannot do is change a
              digest a third party already holds — so the Merkle root moves and the
              anchored token stops matching.
            </p>
            <p className="mt-2">
              We publish three digests and nothing else: the pre-committed battery, the
              pre-registration record, and the hash of each issued certificate or
              refusal. No imagery, no weights, no supplier identity, no verdict text.
            </p>
            <p className="mt-2 text-warn">
              It does <strong>not</strong> stop a compromised certifier. It removes the
              ability to alter the record afterwards.
            </p>
          </div>
        </div>
      </Panel>

      <Panel
        title="Audit trail"
        subtitle="Append-only, hash-chained, Ed25519-signed — not a blockchain"
      >
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-ink-soft text-muted">
              <tr className="border-b border-ink-line">
                <th className="py-2 pr-3 font-normal">#</th>
                <th className="py-2 pr-3 font-normal">timestamp</th>
                <th className="py-2 pr-3 font-normal">event</th>
                <th className="py-2 pr-3 font-normal">signer</th>
                <th className="py-2 font-normal">entry hash</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {ledger.entries.map((e) => (
                <tr key={e.index} className="border-b border-ink-line/40">
                  <td className="py-1.5 pr-3 text-muted">{e.index}</td>
                  <td className="py-1.5 pr-3 text-muted">
                    {e.timestamp_utc.slice(0, 19).replace("T", " ")}
                  </td>
                  <td className="py-1.5 pr-3 text-paper">{e.event_type}</td>
                  <td className="py-1.5 pr-3 text-muted">{e.signer_id}</td>
                  <td className="py-1.5">
                    <Digest value={e.entry_hash} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 border-t border-ink-line pt-3 text-[11px] leading-relaxed text-muted">
          The event vocabulary is closed on purpose. D4.a draws the sequential monitor&apos;s
          candidate change points from exactly these rows, so an alarm either names the
          signer whose act preceded it or is reported as{" "}
          <span className="font-mono text-paper">unexplained_epoch</span> — which is
          strictly worse for us, because it is an alarm we cannot attribute to anybody.
        </p>
      </Panel>

      <Panel
        title="Coverage"
        subtitle="G5 — generated from taxonomy.yaml. A missing class fails the build."
        right={
          <Badge tone="neutral">generation {coverage.taxonomy_generation}</Badge>
        }
      >
        <div className="space-y-2">
          {unsupported.map((i) => (
            <div key={i.class_id} className="rounded border border-ink-line bg-ink px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-paper">{i.class_id}</span>
                <Badge tone="warn">declared_unsupported</Badge>
                {i.attribution_ceiling && (
                  <Badge>ceiling: {i.attribution_ceiling}</Badge>
                )}
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">{i.reason}</p>
            </div>
          ))}
          {notAssessed.map((i) => (
            <div key={i.class_id} className="rounded border border-ink-line bg-ink px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-paper">{i.class_id}</span>
                <Badge tone="warn">not_assessed</Badge>
              </div>
              <p className="mt-1 text-[11px] text-muted">{i.reason}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 border-t border-ink-line pt-3 text-[11px] leading-relaxed text-muted">
          Coverage statements exist everywhere. What is unusual is that a build which{" "}
          <em>fails</em> because an enumerated attack class has no disposition is a CI
          discipline rather than a documentation practice. Delete a class from{" "}
          <span className="font-mono">taxonomy.yaml</span> and the count moves; remove a
          reason from a declared gap and the build stops.
        </p>
      </Panel>

      {report.assurance_debt.items.length > 0 && (
        <Panel
          title="Assurance debt"
          subtitle="D4.d — per owner class, and never as a total"
        >
          <div className="space-y-2">
            {report.assurance_debt.items.map((d) => (
              <div key={d.debt_id} className="rounded border border-ink-line bg-ink px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-paper">{d.debt_id}</span>
                  <Badge tone={d.owner_class === "assessor" ? "accent" : "warn"}>
                    {d.owner_class}
                  </Badge>
                  <span className="font-mono text-xs text-muted">
                    {d.magnitude} {d.unit}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted">{d.description}</p>
                <p className="mt-0.5 text-[11px] text-muted">
                  retires when: {d.retirement_condition}
                  {d.clause_that_would_retire_it
                    ? ` — ${d.clause_that_would_retire_it}`
                    : ""}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded border border-ink-line bg-ink px-3 py-2">
            <p className="font-mono text-[11px] text-warn">
              grand_total: {report.assurance_debt.grand_total}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              Twelve lots and thirty-three null pairs cannot be added. A debt retired by a
              contract clause and a debt retired by GPU hours are not the same kind of
              thing. The partition exists so that neither party can hide inside the
              other&apos;s number — including us: our own unfinished compute is booked under
              our own name.
            </p>
          </div>
        </Panel>
      )}
    </div>
  );
}
