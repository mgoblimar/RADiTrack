
import {
  getDashboardData,
  getDatasetStatusAction,
} from "@/app/actions";

import { HospitalHeader } from "@/components/navigation/HospitalHeader";
import { SimulatorHub } from "@/components/simulator/SimulatorHub";
import { TestDataPanel } from "@/components/test-data/TestDataPanel";

export const dynamic = "force-dynamic";

export default async function SimulatorPage() {
  const [data, datasetStatus] = await Promise.all([
    getDashboardData(),
    getDatasetStatusAction(),
  ]);

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#F4F6FA] px-4 py-5 text-foreground sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-7">
      {/* SHARED HOSPITAL BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.34] saturate-[0.82]"
          style={{ backgroundImage: "url('/qcgh-background.jpg')" }}
        />
        <div className="absolute inset-0 bg-white/[0.34]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(247,249,252,0.08)_0%,rgba(247,249,252,0.02)_38%,rgba(247,249,252,0.16)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_4%,rgba(0,53,122,0.045),transparent_28%),radial-gradient(circle_at_92%_7%,rgba(255,210,0,0.055),transparent_26%)]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1600px] space-y-5">
        {/* SHARED HOSPITAL HEADER */}
        <HospitalHeader pageTitle="RIS Simulator" />

        {/* TEST DATA MANAGEMENT */}
        <TestDataPanel initialStatus={datasetStatus} />

        {/* RIS SIMULATOR */}
        <SimulatorHub
          initialQueue={data.pendingReadingQueue}
          totalExamsCount={data.totalVolume}
        />
      </div>
    </main>
  );
}
