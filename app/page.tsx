"use client";

import { useEffect, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Source = "jira" | "slack" | "google" | "gmail";
type Priority = "high" | "medium" | "low";

interface ActionItem {
  id: string;
  source: Source;
  priority: Priority;
  title: string;
  description: string;
  url?: string;
  deadline?: string;
  jiraRef?: string;
  slackRef?: string;
  raisedAt?: string;   // when the source event actually happened
  createdAt: string;
  completedAt?: string;
}

interface AppData {
  items: ActionItem[];
  archivedItems: ActionItem[];
  lastSynced: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  high:   { label: "High Priority",   emoji: "🔴", color: "#ef4444", bg: "#fef2f2", border: "#fca5a5" },
  medium: { label: "Medium Priority", emoji: "🟡", color: "#f59e0b", bg: "#fffbeb", border: "#fcd34d" },
  low:    { label: "Low Priority",    emoji: "🟢", color: "#10b981", bg: "#f0fdf4", border: "#6ee7b7" },
};

const SOURCE_CONFIG = {
  jira:   { label: "Jira",         color: "#0052cc", bg: "#e8f0fb" },
  slack:  { label: "Slack",        color: "#4a154b", bg: "#f3eef5" },
  google: { label: "Google Drive", color: "#1a73e8", bg: "#e8f4ff" },
  gmail:  { label: "Gmail",        color: "#c5221f", bg: "#fce8e6" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRaisedAt(raisedAt: string): string {
  const diff = Date.now() - new Date(raisedAt).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  <  60) return `${mins}m ago`;
  if (hours <  24) return `${hours}h ago`;
  if (days  ===  1) return "yesterday";
  if (days  <   7) return `${days}d ago`;
  return new Date(raisedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SourceIcon({ source }: { source: Source }) {
  if (source === "jira") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M11.53 2c0 2.4 1.97 4.29 4.37 4.29h1.96v1.95c0 2.4 1.9 4.37 4.29 4.37V2.48a.48.48 0 0 0-.48-.48zm-5.26 5.27c0 2.4 1.97 4.29 4.37 4.29h1.95v1.95a4.29 4.29 0 0 0 4.29 4.29V7.75a.48.48 0 0 0-.48-.48zm-5.27 5.26c0 2.4 1.97 4.29 4.37 4.29h1.96v1.96c0 2.4 1.97 4.29 4.29 4.29v-10.06a.48.48 0 0 0-.48-.48z" />
      </svg>
    );
  }
  if (source === "slack") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 3.957a2.528 2.528 0 0 1-2.521-2.522A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.435v2.522H8.834zm0 1.272a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 7.75a2.528 2.528 0 0 1 2.522-2.521h6.312zm11.213 2.521a2.528 2.528 0 0 1 2.521-2.521A2.528 2.528 0 0 1 24 7.75a2.528 2.528 0 0 1-2.432 2.521h-2.521V7.75zm-1.271 0a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V1.435A2.528 2.528 0 0 1 15.255 0a2.528 2.528 0 0 1 2.521 2.435V7.75zm-2.521 11.208a2.528 2.528 0 0 1 2.521 2.521A2.528 2.528 0 0 1 15.255 24a2.528 2.528 0 0 1-2.521-2.435v-2.521h2.521zm0-1.271a2.528 2.528 0 0 1-2.521-2.522 2.528 2.528 0 0 1 2.521-2.521h6.313A2.528 2.528 0 0 1 24 15.165a2.528 2.528 0 0 1-2.432 2.522h-6.313z" />
      </svg>
    );
  }
  if (source === "google") {
    // Google Drive — official 3-colour triangle
    return (
      <svg width="13" height="12" viewBox="0 0 87.3 78" aria-hidden="true">
        <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
        <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z" fill="#00ac47" />
        <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 11.5z" fill="#ea4335" />
        <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
        <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
        <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
      </svg>
    );
  }
  // Gmail — red M-envelope
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.907 1.528-1.148C21.69 2.28 24 3.434 24 5.457z" fill="#EA4335" />
    </svg>
  );
}

function SourceBadge({ source }: { source: Source }) {
  const cfg = SOURCE_CONFIG[source];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      <SourceIcon source={source} />
      {cfg.label}
    </span>
  );
}

function PriorityDot({ priority }: { priority: Priority }) {
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
      style={{ background: cfg.color }}
      title={cfg.label}
    />
  );
}

function ItemCard({
  item,
  onComplete,
  onRestore,
  archived = false,
}: {
  item: ActionItem;
  onComplete: (id: string) => void;
  onRestore?: (id: string) => void;
  archived?: boolean;
}) {
  const [completing, setCompleting] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const handleCheck = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCompleting(true);
    setTimeout(() => onComplete(item.id), 280);
  };

  const handleRestore = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRestoring(true);
    onRestore?.(item.id);
  };

  const handleCardClick = () => {
    if (item.url) window.open(item.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group flex gap-3 p-4 rounded-xl border bg-white shadow-sm transition-all duration-200 hover:shadow-md ${item.url ? "cursor-pointer" : ""} ${completing || restoring ? "item-complete" : "item-enter"}`}
      style={{ borderColor: completing ? "#d1d5db" : PRIORITY_CONFIG[item.priority].border }}
    >
      {/* Priority dot */}
      <PriorityDot priority={item.priority} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            {/* Title — whole card is clickable, title just shows hover style */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`font-semibold text-sm leading-snug ${item.url ? "text-slate-800 group-hover:text-blue-600 group-hover:underline" : "text-slate-800"}`}>
                {item.title}
              </span>
              <SourceBadge source={item.source} />
            </div>

            {/* Description — the specific ask */}
            <p className="text-sm text-slate-500 leading-relaxed mb-2">{item.description}</p>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-2">
              {item.deadline && (
                <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                  ⏰ {item.deadline}
                </span>
              )}
              {item.jiraRef && (
                <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  🎯 {item.jiraRef}
                </span>
              )}
              {item.raisedAt && (
                <span className="text-xs text-slate-400">
                  raised {formatRaisedAt(item.raisedAt)}
                </span>
              )}
              {archived && item.completedAt && (
                <span className="text-xs text-slate-400">
                  · completed {new Date(item.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              )}
            </div>
          </div>

          {/* Active — checkbox only */}
          {!archived && (
            <button
              onClick={handleCheck}
              disabled={completing}
              className="flex-shrink-0 w-5 h-5 rounded border-2 border-slate-300 hover:border-green-400 hover:bg-green-50 transition-colors duration-150 flex items-center justify-center"
              title="Mark as done"
            >
              {completing && (
                <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          )}

          {/* Archived — restore button + green tick */}
          {archived && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={handleRestore}
                disabled={restoring}
                className="w-5 h-5 rounded border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-300 hover:text-blue-500 transition-colors duration-150 flex items-center justify-center"
                title="Move back to Active"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                </svg>
              </button>
              <div className="w-5 h-5 rounded border-2 border-green-400 bg-green-50 flex items-center justify-center">
                <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PrioritySection({
  priority,
  items,
  onComplete,
}: {
  priority: Priority;
  items: ActionItem[];
  onComplete: (id: string) => void;
}) {
  if (!items.length) return null;
  const cfg = PRIORITY_CONFIG[priority];

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">{cfg.emoji}</span>
        <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">{cfg.label}</h2>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ color: cfg.color, background: cfg.bg }}
        >
          {items.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} onComplete={onComplete} />
        ))}
      </div>
    </section>
  );
}

function EmptyState({ tab }: { tab: "active" | "archive" }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl mb-4">{tab === "active" ? "✅" : "📦"}</div>
      <h3 className="font-semibold text-slate-600 text-lg mb-1">
        {tab === "active" ? "You're all caught up!" : "No archived items yet"}
      </h3>
      <p className="text-slate-400 text-sm">
        {tab === "active"
          ? "Hit Refresh to check for new action items."
          : "Completed items will appear here."}
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [activeTab, setActiveTab] = useState<"active" | "archive">("active");
  const [data, setData] = useState<AppData>({ items: [], archivedItems: [], lastSynced: "" });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Load items on mount + auto-poll every 3 minutes
  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/items");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Silent background poll — picks up data.json changes from scheduled agent
    const interval = setInterval(loadData, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Mark item as complete → moves to archive
  const handleComplete = async (id: string) => {
    const res = await fetch(`/api/items/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "complete" }) });
    if (res.ok) setData(await res.json());
  };

  // Restore archived item → moves back to active
  const handleRestore = async (id: string) => {
    const res = await fetch(`/api/items/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "restore" }) });
    if (res.ok) setData(await res.json());
  };

  // Reload data.json from disk
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshStatus("Reloading…");
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      if (res.ok) {
        await loadData();
        setRefreshStatus("Up to date");
      } else {
        setRefreshStatus("Reload failed");
      }
    } catch {
      setRefreshStatus("Reload failed");
    } finally {
      setIsRefreshing(false);
      setTimeout(() => setRefreshStatus(""), 3000);
    }
  };

  // Split active items by priority
  const high   = data.items.filter((i) => i.priority === "high");
  const medium = data.items.filter((i) => i.priority === "medium");
  const low    = data.items.filter((i) => i.priority === "low");

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 shadow-md" style={{ background: "var(--header)" }}>
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <h1 className="text-white font-bold text-lg tracking-tight">To-Do Agent</h1>
            </div>
            {data.lastSynced && (
              <p className="text-slate-400 text-xs mt-0.5">
                Last synced {new Date(data.lastSynced).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {refreshStatus && (
              <span className="text-xs text-slate-300 animate-pulse">{refreshStatus}</span>
            )}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: isRefreshing ? "#334155" : "#3b82f6", color: "white" }}
            >
              <svg
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isRefreshing ? "Syncing…" : "Refresh"}
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="max-w-3xl mx-auto px-6 flex gap-1 pb-0">
          {(["active", "archive"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-150 capitalize"
              style={{
                borderColor: activeTab === tab ? "#3b82f6" : "transparent",
                color: activeTab === tab ? "#93c5fd" : "#94a3b8",
              }}
            >
              {tab === "active" ? `Active${data.items.length ? ` (${data.items.length})` : ""}` : `Archive${data.archivedItems.length ? ` (${data.archivedItems.length})` : ""}`}
            </button>
          ))}
        </div>
      </header>

      {/* ── Body ── */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        {loading ? (
          /* Skeleton */
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-20 rounded-xl bg-white border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : activeTab === "active" ? (
          data.items.length === 0 ? (
            <EmptyState tab="active" />
          ) : (
            <>
              <PrioritySection priority="high"   items={high}   onComplete={handleComplete} />
              <PrioritySection priority="medium" items={medium} onComplete={handleComplete} />
              <PrioritySection priority="low"    items={low}    onComplete={handleComplete} />
            </>
          )
        ) : (
          data.archivedItems.length === 0 ? (
            <EmptyState tab="archive" />
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-2">
                {data.archivedItems.length} completed item{data.archivedItems.length !== 1 ? "s" : ""}
              </p>
              {[...data.archivedItems].reverse().map((item) => (
                <ItemCard key={item.id} item={item} onComplete={() => {}} onRestore={handleRestore} archived />
              ))}
            </div>
          )
        )}
      </main>
    </div>
  );
}
