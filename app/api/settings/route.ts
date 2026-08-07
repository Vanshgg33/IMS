import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Settings from "@/models/Settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const settings = await Settings.findById("global");
    return NextResponse.json({ alertEmails: settings?.alertEmails ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    if (!Array.isArray(body.alertEmails)) {
      return NextResponse.json({ error: "alertEmails must be an array" }, { status: 400 });
    }

    const emails = [
      ...new Set(
        body.alertEmails
          .map((e: unknown) => (typeof e === "string" ? e.trim().toLowerCase() : ""))
          .filter((e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
      ),
    ];

    const settings = await Settings.findByIdAndUpdate(
      "global",
      { alertEmails: emails },
      { upsert: true, new: true }
    );

    return NextResponse.json({ alertEmails: settings.alertEmails });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
