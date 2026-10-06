import { getDashboardData } from "@/app/actions";
import { SimulatorHub } from "@/components/simulator/SimulatorHub";

export const dynamic = "force-dynamic";

export default async function SimulatorPage() {
  const data = await getDashboardData();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans">
      <SimulatorHub
        initialQueue={data.pendingReadingQueue}
        totalExamsCount={data.totalVolume}
      />
    </div>
  );
}
