import { getDashboardData, getDatasetStatusAction } from "@/app/actions";
import { SimulatorHub } from "@/components/simulator/SimulatorHub";
import { TestDataPanel } from "@/components/test-data/TestDataPanel";

export const dynamic = "force-dynamic";

export default async function SimulatorPage() {
  const [data, datasetStatus] = await Promise.all([
    getDashboardData(),
    getDatasetStatusAction(),
  ]);

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 md:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-[1600px] space-y-5">
        <TestDataPanel initialStatus={datasetStatus} />
        <SimulatorHub
          initialQueue={data.pendingReadingQueue}
          totalExamsCount={data.totalVolume}
        />
      </div>
    </main>
  );
}
