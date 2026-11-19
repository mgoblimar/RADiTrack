import { BACKLOG_AGE_GROUPS, type BacklogAgeCounts } from "@/lib/backlog-age";

/**
 * CAL-18: the reading backlog by how long each exam has waited since it was completed.
 * Plain styling on purpose; restyle freely.
 */
export function BacklogAgeList({ counts, title = "Waiting since completion" }: { counts?: BacklogAgeCounts | null; title?: string }) {
  if (!counts) return null;
  return (
    <div className="mt-2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
      <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[12px]">
        {BACKLOG_AGE_GROUPS.map((group) => (
          <div key={group.key} className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">{group.label}</dt>
            <dd className={`font-extrabold ${counts[group.key] > 0 ? "text-qc-orange" : "text-muted-foreground"}`}>{counts[group.key]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
