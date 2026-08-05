import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import UploadBatch from "@/models/UploadBatch";

export async function GET() {
  await connectDB();
  const batches = await UploadBatch.find().sort({ createdAt: -1 }).limit(100).lean();
  return NextResponse.json(batches);
}
