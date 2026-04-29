import { NextResponse } from "next/server";
import { readDataFile } from "@/lib/data";

/**
 * POST /api/refresh
 *
 * Reloads data.json from disk and returns the latest state.
 * Actual data collection (querying Jira, Slack, Google, Gmail) happens via
 * the /collect slash command in Claude Code, which writes to data.json.
 * This endpoint is intentionally lightweight — just a file read.
 */
export async function POST() {
  try {
    const data = await readDataFile();
    return NextResponse.json({
      added: 0,
      total: data.items.length,
      lastSynced: data.lastSynced,
      reloaded: true,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
