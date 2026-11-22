"use client";

import { useEffect, useState, useTransition } from "react";
import { getAmendmentWindowAction, updateAmendmentWindowAction } from "@/app/actions";

/**
 * Days after the first sign-off during which a re-upload may amend a signed-off exam
 * (the admin still confirms each amendment in the import preview). Plain styling: restyle freely.
 */
export function AmendmentWindowSetting({ isAdmin }: { isAdmin: boolean }) {
  const [days, setDays] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getAmendmentWindowAction()
      .then((value) => { setDays(value); setDraft(String(value)); })
      .catch(() => setMessage({ tone: "error", text: "Could not load the amendment window." }));
  }, []);

  const save = () => {
    const value = Number(draft);
    startTransition(async () => {
      const result = await updateAmendmentWindowAction(value);
      if (!result.success || result.days === undefined) {
        setMessage({ tone: "error", text: result.message ?? "Could not save." });
        return;
      }
      setDays(result.days);
      setMessage({ tone: "ok", text: `Saved: ${result.days} day(s).` });
    });
  };

  return (
    <section aria-labelledby="amendment-window-title" className="rounded-2xl border border-border bg-card px-5 py-4">
      <h3 id="amendment-window-title" className="text-sm font-extrabold text-qc-navy">Amendment window</h3>
      <p className="mt-1 text-[13px] text-muted-foreground">
        A re-uploaded file may change a signed-off exam only within this many days of its first sign-off, and only when the
        administrator confirms it in the import preview. TAT always stays on the first sign-off.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isAdmin ? (
          <>
            <label htmlFor="amendment-window-days" className="text-xs font-bold text-qc-navy">Days after sign-off</label>
            <input
              id="amendment-window-days"
              type="number"
              min={0}
              max={90}
              step={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={days === null || isPending}
              className="h-9 w-24 rounded-xl border border-border bg-background px-3 text-sm"
            />
            <button
              type="button"
              onClick={save}
              disabled={days === null || isPending || draft === String(days)}
              className="h-9 rounded-xl bg-qc-navy px-4 text-xs font-extrabold text-white hover:bg-qc-blue disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save
            </button>
          </>
        ) : (
          <p className="text-sm font-bold text-qc-navy">{days === null ? "…" : `${days} day(s)`} · set by the administrator</p>
        )}
        {message && (
          <p role="status" className={`text-xs font-bold ${message.tone === "ok" ? "text-emerald-700" : "text-red-700"}`}>{message.text}</p>
        )}
      </div>
    </section>
  );
}
