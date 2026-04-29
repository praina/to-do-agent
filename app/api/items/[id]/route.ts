import { NextResponse } from "next/server";
import { readDataFile, writeDataFile } from "@/lib/data";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { action } = await request.json();
  const data = await readDataFile();

  if (action === "complete") {
    const idx = data.items.findIndex((i) => i.id === id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [item] = data.items.splice(idx, 1);
    item.completedAt = new Date().toISOString();
    data.archivedItems.push(item);

    await writeDataFile(data);
    return NextResponse.json(data);
  }

  if (action === "restore") {
    const idx = data.archivedItems.findIndex((i) => i.id === id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [item] = data.archivedItems.splice(idx, 1);
    delete item.completedAt;

    // Insert at the top, then re-sort so high → medium → low order is maintained.
    // Within each priority band the restored item ends up first (most recent).
    const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
    data.items.unshift(item);
    data.items.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

    await writeDataFile(data);
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
