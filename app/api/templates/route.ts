import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ReportTemplate from "@/models/ReportTemplate";

export const dynamic = "force-dynamic";

export async function GET() {
  await connectDB();
  const templates = await ReportTemplate.find().lean();
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const template = await ReportTemplate.findOneAndUpdate(
    { name: body.name },
    { $set: { columnMap: body.columnMap, type: body.type } },
    { upsert: true, new: true }
  );
  return NextResponse.json(template);
}
