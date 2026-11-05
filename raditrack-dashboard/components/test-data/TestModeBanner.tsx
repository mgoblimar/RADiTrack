import Link from "next/link";
import { FlaskConical } from "lucide-react";

/** Shown on every staff screen while the validation dataset replaces real data. */
export function TestModeBanner({ backupCount }: { backupCount: number }) {
  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-amber-500/40 bg-amber-100 px-4 py-2 text-center text-xs font-bold text-amber-950"
    >
      <FlaskConical className="h-4 w-4 shrink-0 text-amber-700" />
      <span>
        TEST DATA ACTIVE: these figures come from the 100-exam validation dataset, not real hospital records
        ({backupCount} real exams are safely backed up).
      </span>
      <Link href="/simulator" className="underline underline-offset-2 hover:text-amber-800">
        Restore real data
      </Link>
    </div>
  );
}
