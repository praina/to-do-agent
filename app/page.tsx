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
  raisedAt?: string;
  createdAt: string;
  completedAt?: string;
  quote?: string;       // exact text from the source (Slack message, Jira comment, Gmail body)
  quoteAuthor?: string; // "Jordan Lee · #product · Apr 26"
}

interface AppData {
  items: ActionItem[];
  archivedItems: ActionItem[];
  lastSynced: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRIO_CLASS: Record<Priority, "p0" | "p1" | "p2"> = {
  high: "p0",
  medium: "p1",
  low: "p2",
};

const PRIO_LABEL: Record<Priority, string> = {
  high: "Critical",
  medium: "High priority",
  low: "Normal",
};

function formatRaisedAt(raisedAt: string): string {
  const diff = Date.now() - new Date(raisedAt).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(raisedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Extracts a human-readable channel/chat label from quoteAuthor
// e.g. "Jordan Lee · #product · Apr 26" → "#product"
function slackChannelLabel(item: ActionItem): string {
  if (item.quoteAuthor) {
    const parts = item.quoteAuthor.split("·").map((s) => s.trim());
    if (parts.length >= 2 && parts[1]) return parts[1];
  }
  return "Slack thread";
}

// Detects if a Gmail item is actually a Google Docs/Sheets/Slides comment notification.
// Returns the pill class and display label to use instead of "gmail".
function resolveGmailSource(url?: string): { pillClass: string; label: string } | null {
  if (!url || !url.includes("docs.google.com")) return null;
  if (url.includes("/spreadsheets/")) return { pillClass: "drive", label: "Google Sheets" };
  if (url.includes("/presentation/")) return { pillClass: "drive", label: "Google Slides" };
  return { pillClass: "drive", label: "Google Docs" };
}

// Extracts the document name from quoteAuthor for Gmail (Google Docs comment) items.
// e.g. "Maya Patel · Q2 Roadmap Planning · Apr 28" → "Q2 Roadmap Planning"
function gmailDocLabel(item: ActionItem): string {
  if (item.quoteAuthor) {
    const parts = item.quoteAuthor.split("·").map((s) => s.trim());
    if (parts.length >= 2 && parts[1]) return parts[1];
  }
  return "Google Doc";
}

// Derives live source stats from active items only.
// Slack  → distinct channels (from quoteAuthor)
// Jira   → distinct project prefixes (PROJ-1842 → PROJ)
// Gmail  → distinct Google Sheets/Docs/Slides documents (from quoteAuthor + URL)
function deriveSourceStats(items: ActionItem[]): string[] {
  const slackChannels = new Set<string>();
  const jiraProjects  = new Set<string>();
  const googleDocs    = new Set<string>();

  for (const item of items) {
    if (item.source === "slack") {
      slackChannels.add(slackChannelLabel(item));
    } else if (item.source === "jira" && item.jiraRef) {
      jiraProjects.add(item.jiraRef.replace(/-\d+$/, "")); // PROJ-1842 → PROJ
    } else if (item.source === "gmail" && resolveGmailSource(item.url)) {
      googleDocs.add(gmailDocLabel(item));
    } else if (item.source === "google") {
      googleDocs.add(gmailDocLabel(item));
    }
  }

  const parts: string[] = [];
  if (slackChannels.size > 0)
    parts.push(`${slackChannels.size} Slack ${slackChannels.size === 1 ? "channel" : "channels"}`);
  if (jiraProjects.size > 0)
    parts.push(`${jiraProjects.size} Jira ${jiraProjects.size === 1 ? "project" : "projects"}`);
  if (googleDocs.size > 0)
    parts.push(`${googleDocs.size} ${googleDocs.size === 1 ? "Sheet" : "Sheets"}`);

  return parts;
}

// ─── SourcePill ───────────────────────────────────────────────────────────────

function SourcePill({ source, url }: { source: Source; url?: string }) {
  // Gmail items that link to docs.google.com are really Google Docs/Sheets/Slides
  // comment notifications — show the Drive icon and correct product name instead.
  const gmailOverride = source === "gmail" ? resolveGmailSource(url) : null;

  const labels: Record<Source, string> = {
    jira: "Jira",
    slack: "Slack",
    google: "Google Drive",
    gmail: "Gmail",
  };

  const pillClass = gmailOverride?.pillClass ?? (source === "google" ? "drive" : source);
  const pillLabel = gmailOverride?.label ?? labels[source];
  // Treat overridden Gmail items as "google" for icon rendering purposes
  const iconSource = gmailOverride ? "google" : source;

  return (
    <span className={`pill ${pillClass}`}>
      {iconSource === "slack" && (
        <svg className="pill-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5.1 15.1a2.1 2.1 0 1 1-2.1-2.1h2.1v2.1z" fill="#E01E5A"/>
          <path d="M6.2 15.1a2.1 2.1 0 1 1 4.2 0v5.3a2.1 2.1 0 1 1-4.2 0v-5.3z" fill="#E01E5A"/>
          <path d="M8.3 5.1A2.1 2.1 0 1 1 10.4 3v2.1H8.3z" fill="#36C5F0"/>
          <path d="M8.3 6.2a2.1 2.1 0 1 1 0 4.2H3a2.1 2.1 0 1 1 0-4.2h5.3z" fill="#36C5F0"/>
          <path d="M18.4 8.3a2.1 2.1 0 1 1 2.1 2.1h-2.1V8.3z" fill="#2EB67D"/>
          <path d="M17.3 8.3a2.1 2.1 0 1 1-4.2 0V3a2.1 2.1 0 1 1 4.2 0v5.3z" fill="#2EB67D"/>
          <path d="M15.2 18.4a2.1 2.1 0 1 1-2.1 2.1v-2.1h2.1z" fill="#ECB22E"/>
          <path d="M15.2 17.3a2.1 2.1 0 1 1 0-4.2h5.3a2.1 2.1 0 1 1 0 4.2h-5.3z" fill="#ECB22E"/>
        </svg>
      )}
      {iconSource === "jira" && (
        <svg className="pill-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11.5 2.5L2 12l9.5 9.5 4.2-4.2-5.3-5.3 5.3-5.3z" fill="#2684FF"/>
          <path d="M11.5 7.7L15.7 12l-4.2 4.3-4.2-4.3z" fill="#0052CC"/>
        </svg>
      )}
      {iconSource === "gmail" && (
        <svg className="pill-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.907 1.528-1.148C21.69 2.28 24 3.434 24 5.457z" fill="#EA4335"/>
        </svg>
      )}
      {iconSource === "google" && (
        <svg className="pill-icon" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
          <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
          <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z" fill="#00ac47"/>
          <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 11.5z" fill="#ea4335"/>
          <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
          <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
          <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
        </svg>
      )}
      {pillLabel}
    </span>
  );
}

// ─── TaskRow ─────────────────────────────────────────────────────────────────

function TaskRow({
  item,
  selected,
  archived,
  onSelect,
  onToggle,
}: {
  item: ActionItem;
  selected: boolean;
  archived?: boolean;
  onSelect: () => void;
  onToggle: () => void;
}) {
  const [completing, setCompleting] = useState(false);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (archived) return;
    setCompleting(true);
    setTimeout(() => onToggle(), 280);
  };

  return (
    <div
      className={`task${selected ? " selected" : ""}${completing ? " item-complete" : ""}${archived ? " completed" : ""}`}
      onClick={onSelect}
    >
      <span className={`task-prio ${PRIO_CLASS[item.priority]}`}></span>
      <button
        className={`task-check${archived || completing ? " checked" : ""}`}
        onClick={handleToggle}
        aria-label={archived ? "Archived" : "Mark as done"}
      >
        <span className="msi">check</span>
      </button>
      <div className="task-body">
        <div className="task-head">
          <span className="task-title">{item.title}</span>
          <SourcePill source={item.source} url={item.url} />
        </div>
        <div className="task-summary">{item.description}</div>
        <div className="task-meta">
          {item.deadline && (
            <span className="pill due">
              <span className="msi">event</span>
              {item.deadline}
            </span>
          )}
          {item.raisedAt && <span>raised {formatRaisedAt(item.raisedAt)}</span>}
          {(item.jiraRef || item.slackRef || (item.source === "gmail" && resolveGmailSource(item.url))) && (
            <>
              <span className="dot"></span>
              <span>
                {item.jiraRef
                  ? item.jiraRef
                  : item.slackRef
                  ? slackChannelLabel(item)
                  : gmailDocLabel(item)}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="task-right">
        <span className="msi">chevron_right</span>
      </div>
    </div>
  );
}

// ─── Detail Pane ─────────────────────────────────────────────────────────────

function DetailPane({
  item,
  isArchived,
  onMarkDone,
  onRestore,
}: {
  item: ActionItem | null;
  isArchived: boolean;
  onMarkDone: (id: string) => void;
  onRestore: (id: string) => void;
}) {
  if (!item) {
    return (
      <div className="detail-pane">
        <div className="detail-empty">Select a task to view details</div>
      </div>
    );
  }

  const prioClass = PRIO_CLASS[item.priority];
  const sourceLabel =
    item.source === "google" ? "Google Drive"
    : item.source === "gmail" ? "Gmail"
    : item.source === "jira" ? "Jira"
    : "Slack";

  const refLabel =
    item.jiraRef
      ? item.jiraRef
      : item.slackRef
      ? slackChannelLabel(item)
      : item.source === "gmail" && resolveGmailSource(item.url)
      ? gmailDocLabel(item)
      : sourceLabel;

  return (
    <div className="detail-pane">
      {/* Sticky toolbar */}
      <div className="detail-toolbar">
        <div className="crumbs">
          <span className="msi">inbox</span>
          <span>{isArchived ? "Archive" : "Active"}</span>
          <span className="msi">chevron_right</span>
          <span style={{ color: "var(--fg-1)" }}>{refLabel}</span>
        </div>
        <div className="actions">
          {!isArchived && (
            <button className="btn done" onClick={() => onMarkDone(item.id)}>
              <span className="msi">check</span>
              Mark done
            </button>
          )}
          {isArchived && (
            <button className="btn done" onClick={() => onRestore(item.id)}>
              <span className="msi">undo</span>
              Restore
            </button>
          )}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn primary"
            >
              <span className="msi">open_in_new</span>
              Open source
            </a>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="detail">
        {/* Priority chip */}
        <span className={`detail-prio ${prioClass}`}>
          {item.priority === "high" && (
            <><span className="msi" style={{ fontSize: 13 }}>error</span> P0 · Critical</>
          )}
          {item.priority === "medium" && (
            <><span className="msi" style={{ fontSize: 13 }}>warning</span> P1 · High</>
          )}
          {item.priority === "low" && (
            <><span className="msi" style={{ fontSize: 13 }}>schedule</span> P2 · Normal</>
          )}
        </span>

        {/* Title */}
        <h1 className="detail-title">{item.title}</h1>

        {/* Meta row */}
        <div className="detail-meta-row">
          <SourcePill source={item.source} url={item.url} />
          {item.jiraRef && <span>{item.jiraRef}</span>}
          {item.slackRef && !item.jiraRef && <span>{slackChannelLabel(item)}</span>}
          {item.source === "gmail" && resolveGmailSource(item.url) && (
            <span>{gmailDocLabel(item)}</span>
          )}
          {item.raisedAt && (
            <>
              <span className="sep"></span>
              <span>raised {formatRaisedAt(item.raisedAt)}</span>
            </>
          )}
          {item.deadline && (
            <>
              <span className="sep"></span>
              <span className="pill due">
                <span className="msi">event</span>
                due {item.deadline}
              </span>
            </>
          )}
        </div>

        {/* Agent summary — standalone warm parchment card */}
        <div className="detail-summary">
          <div className="label">
            <span className="msi">auto_awesome</span> Agent summary
          </div>
          <p className="summary-body">{item.description}</p>
        </div>

        {/* Suggested actions */}
        <div className="detail-section">
          <h2 className="detail-section-title">Suggested actions</h2>
          <div className="suggested">
            {item.url && item.source === "slack" && (
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn done">
                <span className="msi">open_in_new</span>Open thread
              </a>
            )}
            {item.url && item.source === "jira" && (
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn done">
                <span className="msi">open_in_new</span>Open {item.jiraRef ?? "ticket"}
              </a>
            )}
            {item.url && item.source === "gmail" && (
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn done">
                <span className="msi">open_in_new</span>Open comment
              </a>
            )}
            {item.url && item.source === "google" && (
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn done">
                <span className="msi">open_in_new</span>Open document
              </a>
            )}
            {!item.url && (
              <span style={{ fontSize: 13, color: "var(--fg-3)" }}>
                No direct link available.
              </span>
            )}
          </div>
        </div>

        {/* Context & Evidence — combined section */}
        <div className="detail-section">
          <h2 className="detail-section-title">Context &amp; Evidence</h2>

          {item.quote ? (
            <div className="evidence-item">
              {item.quoteAuthor && <div className="src">{item.quoteAuthor}</div>}
              &ldquo;{item.quote}&rdquo;
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "var(--fg-3)", margin: 0 }}>
              No quote captured — run <code style={{ fontFamily: "var(--font-mono)", background: "var(--gray-3)", padding: "1px 5px", borderRadius: 3 }}>/collect-todo</code> to refresh with evidence.
            </p>
          )}
        </div>

        {/* Activity — latest → oldest */}
        {(item.raisedAt || item.createdAt || item.completedAt) && (
          <div className="detail-section">
            <h2 className="detail-section-title">Activity</h2>
            <div className="activity-timeline">
              {item.completedAt && (
                <div className="activity-item">
                  <span className="marker"></span>
                  <div>
                    <div className="at">{formatDate(item.completedAt)}</div>
                    <div>Marked as done</div>
                  </div>
                </div>
              )}
              {item.createdAt && (
                <div className="activity-item">
                  <span className="marker"></span>
                  <div>
                    <div className="at">{formatDate(item.createdAt)}</div>
                    <div>Added to your queue</div>
                  </div>
                </div>
              )}
              {item.raisedAt && (
                <div className="activity-item">
                  <span className="marker"></span>
                  <div>
                    <div className="at">{formatDate(item.raisedAt)}</div>
                    <div>Surfaced by agent</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
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
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
    const interval = setInterval(loadData, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Auto-select first item once data loads
  useEffect(() => {
    if (!selectedId && data.items.length > 0) {
      setSelectedId(data.items[0].id);
    }
  }, [data.items, selectedId]);

  // Mark item as complete → moves to archive
  const handleComplete = async (id: string) => {
    const res = await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete" }),
    });
    if (res.ok) {
      const next = await res.json();
      setData(next);
      // Select next available item
      if (selectedId === id) {
        const remaining = next.items as ActionItem[];
        setSelectedId(remaining[0]?.id ?? null);
      }
    }
  };

  // Restore archived item → moves back to active
  const handleRestore = async (id: string) => {
    const res = await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore" }),
    });
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

  // Priority groups for active tab
  const high   = data.items.filter((i) => i.priority === "high");
  const medium = data.items.filter((i) => i.priority === "medium");
  const low    = data.items.filter((i) => i.priority === "low");

  const activeCount  = data.items.length;
  const archiveCount = data.archivedItems.length;

  // Selected item (search both lists)
  const allItems = [...data.items, ...data.archivedItems];
  const selectedItem = selectedId ? (allItems.find((t) => t.id === selectedId) ?? null) : null;
  const isSelectedArchived = selectedItem
    ? data.archivedItems.some((t) => t.id === selectedItem.id)
    : false;

  const sourceStats = deriveSourceStats(data.items);

  const lastSyncLabel = data.lastSynced
    ? new Date(data.lastSynced).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="app">

      {/* ── Top bar ── */}
      <div className="topbar">
        <div className="tb-brand">
          <div className="tb-mark">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M3 6h18M6 12h12M9 18h6"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div>
            <div className="tb-title">To-Do Agent</div>
            {lastSyncLabel && <div className="tb-sub">Last synced {lastSyncLabel}</div>}
          </div>
        </div>
        <div className="tb-divider"></div>
        <div className="tb-status">
          <span className="dot"></span>
          {loading
            ? "Loading…"
            : sourceStats.length > 0
            ? sourceStats.join(" · ")
            : "No active items"}
        </div>
        <div className="tb-spacer"></div>
        {refreshStatus && (
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{refreshStatus}</span>
        )}
        <button
          className={`icon-btn${isRefreshing ? " spinning" : ""}`}
          onClick={handleRefresh}
          disabled={isRefreshing}
          title="Refresh"
        >
          <span className="msi">refresh</span>
        </button>
      </div>

      {/* ── Sub-bar (tabs + search) ── */}
      <div className="subbar">
        <div className="tabs">
          <button
            className={`tab${activeTab === "active" ? " active" : ""}`}
            onClick={() => setActiveTab("active")}
          >
            Active <span className="count">{activeCount}</span>
          </button>
          <button
            className={`tab${activeTab === "archive" ? " active" : ""}`}
            onClick={() => setActiveTab("archive")}
          >
            Archive <span className="count">{archiveCount}</span>
          </button>
        </div>
      </div>

      {/* ── Main two-pane ── */}
      <div className="main">

        {/* List pane */}
        <div className="list-pane">
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  style={{
                    height: 80,
                    borderRadius: "var(--radius-4)",
                    background: "var(--gray-3)",
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}
                />
              ))}
            </div>
          ) : activeTab === "active" ? (
            data.items.length === 0 ? (
              <div className="detail-empty" style={{ paddingTop: 64 }}>
                You&apos;re all caught up! Hit Refresh to check for new items.
              </div>
            ) : (
              <>
                {(
                  [
                    ["high", high],
                    ["medium", medium],
                    ["low", low],
                  ] as [Priority, ActionItem[]][]
                ).map(([p, items]) =>
                  items.length > 0 ? (
                    <div key={p} className="list-section">
                      <div className="list-section-header">
                        {PRIO_LABEL[p]}
                        <span className="count">{items.length}</span>
                      </div>
                      <div className="list-stack">
                        {items.map((item) => (
                          <TaskRow
                            key={item.id}
                            item={item}
                            selected={item.id === selectedId}
                            onSelect={() => setSelectedId(item.id)}
                            onToggle={() => handleComplete(item.id)}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null
                )}
              </>
            )
          ) : data.archivedItems.length === 0 ? (
            <div className="detail-empty" style={{ paddingTop: 64 }}>
              No archived items yet.
            </div>
          ) : (
            <div className="list-stack">
              {[...data.archivedItems].reverse().map((item) => (
                <TaskRow
                  key={item.id}
                  item={item}
                  selected={item.id === selectedId}
                  archived
                  onSelect={() => setSelectedId(item.id)}
                  onToggle={() => {}}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail pane */}
        <DetailPane
          item={selectedItem}
          isArchived={isSelectedArchived}
          onMarkDone={handleComplete}
          onRestore={handleRestore}
        />
      </div>
    </div>
  );
}
