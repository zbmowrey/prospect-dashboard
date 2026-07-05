import { NextResponse } from "next/server";
import { listProspectsForUi } from "@/lib/prospects";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(listProspectsForUi());
}
