import { NextResponse } from "next/server";
import {
  getProspectForUi,
  requeueCapture,
  setStatus,
} from "@/lib/prospects";
import type { ProspectStatus } from "@/lib/types";

const STATUSES: ProspectStatus[] = ["new", "hotlist", "rejected"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  let body: { status?: string; captureStatus?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!getProspectForUi(numId)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let updated = null;
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status as ProspectStatus)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    updated = setStatus(numId, body.status as ProspectStatus);
  }
  if (body.captureStatus === "pending") {
    updated = requeueCapture(numId);
  }

  if (!updated) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }
  return NextResponse.json(updated);
}
