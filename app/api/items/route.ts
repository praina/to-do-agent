import { NextResponse } from "next/server";
import { readDataFile } from "@/lib/data";

export async function GET() {
  const data = await readDataFile();
  return NextResponse.json(data);
}
