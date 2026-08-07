import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ReportTemplate from "@/models/ReportTemplate";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const templates = await ReportTemplate.find().lean();
    return NextResponse.json(templates);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const template = await ReportTemplate.findOneAndUpdate(
      { name: body.name },
      { $set: { columnMap: body.columnMap, type: body.type } },
      { upsert: true, new: true }
    );
    return NextResponse.json(template);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
