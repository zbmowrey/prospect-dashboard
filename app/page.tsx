import { listProspectsForUi } from "@/lib/prospects";
import ProspectBoard from "./components/ProspectBoard";

// Always read the DB fresh; never statically prerender.
export const dynamic = "force-dynamic";

export default function Home() {
  const prospects = listProspectsForUi();
  return <ProspectBoard initialProspects={prospects} />;
}
