import { getDashboardData } from "@/app/actions";
import { SimulatorHub } from "@/components/simulator/SimulatorHub";

export const dynamic = "force-dynamic";

export default async function SimulatorPage() {
  const data = await getDashboardData();

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 md:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-[1600px]">
        <SimulatorHub
          initialQueue={data.pendingReadingQueue}
          totalExamsCount={data.totalVolume}
        />
      </div>
    </main>
  );
}