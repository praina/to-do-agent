import fs from "fs/promises";
import path from "path";

const DATA_PATH = path.resolve(process.cwd(), "data.json");

interface ActionItem {
  id: string;
  source: "jira" | "slack" | "google";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  url?: string;
  deadline?: string;
  jiraRef?: string;
  slackRef?: string;
  createdAt: string;
  completedAt?: string;
}

interface AppData {
  items: ActionItem[];
  archivedItems: ActionItem[];
  lastSynced: string;
}

const EMPTY: AppData = { items: [], archivedItems: [], lastSynced: "" };

export async function readDataFile(): Promise<AppData> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    return { ...EMPTY };
  }
}

export async function writeDataFile(data: AppData): Promise<void> {
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2));
}
