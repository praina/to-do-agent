# To-Do Agent

A personal action-item aggregator that pulls your open tasks from Jira, Slack, Gmail, and Google Drive into a single prioritised web app — so you always know what needs your attention and who is waiting on you.

---

## What it does

Every time you run `/collect-todo`, the agent scans your connected tools, finds everything that requires action from you, prioritises it, and writes it to a local web app running at `localhost:3000`. Items survive across sessions in a `data.json` file — ticking one off archives it, and you can restore it if needed.

---

## Workflow

### Step 1 — Data Sources

The agent connects to four tools via MCP (Model Context Protocol) servers:

| Source | What it captures |
|---|---|
| 🎯 **Jira** | Tickets assigned to you · Issues where you are mentioned in comments |
| 💬 **Slack** | Channel @mentions · Direct messages · Saved items (Save for later) |
| 📧 **Gmail** | Google Docs/Sheets comment notifications (whenever someone @mentions or assigns you in a comment) |
| 📄 **Google Drive** | Files where your name or email appears |

> **Why Gmail for Google comments?** Google sends a notification email every time someone @mentions you in a Sheet, Doc, or Slide comment. Reading these emails is more reliable than scanning Drive files directly, because Drive's API doesn't expose comment threads easily.

---

### Step 2 — Collection Agent (`/collect-todo`)

Run this slash command inside Claude Code. It executes six steps in sequence:

1. **Load** — reads `data.json` and notes every existing item ID so nothing is duplicated
2. **Fetch** — queries all four sources in parallel; extracts the specific ask, a source URL, and the `raisedAt` timestamp (the moment the original message/comment/ticket event happened)
3. **Filter** — skips items already in `data.json`, skips resolved/closed tickets, skips automated bot notifications
4. **Prioritise** — assigns one of three priority levels (see Priority Logic below)
5. **Merge** — if multiple people in the same Slack thread are all waiting on the same answer from you, they become one item instead of several
6. **Write** — merges new items into `data.json` and saves a human-readable `ACTION_ITEMS_YYYY-MM-DD.md` backup

---

### Step 3 — Data Store (`data.json`)

All items live in a single JSON file at the project root:

```
data.json
├── items[]          Active items, sorted high → medium → low
├── archivedItems[]  Completed items, newest first
└── lastSynced       ISO timestamp of the last /collect-todo run
```

Each item carries:
- `id` — unique identifier (e.g. `slack-dm-viraj-bajaj`)
- `source` — `jira` | `slack` | `gmail` | `google`
- `priority` — `high` | `medium` | `low`
- `title` — short label
- `description` — one sentence: exactly what you need to do
- `url` — deep link back to the source (ticket, Slack message, Sheet)
- `raisedAt` — when the original ask was made (not when it was synced)
- `jiraRef` — ticket key if cross-referenced from Slack
- `deadline` — due date if available from Jira

---

### Step 4 — Web App (`localhost:3000`)

A Next.js app that reads `data.json` and presents it as a live dashboard. Three API routes power all interactions:

| Method | Route | What it does |
|---|---|---|
| `GET` | `/api/items` | Reads `data.json` from disk and returns it to the browser |
| `PATCH` | `/api/items/:id` | `complete` → moves item to archive · `restore` → moves it back to active and re-sorts by priority |
| `POST` | `/api/refresh` | Re-reads `data.json` — picks up the latest `/collect-todo` run |

The browser also **auto-polls** `GET /api/items` every 3 minutes silently in the background, so the view stays fresh without manual refreshes.

---

### Step 5 — You

| Action | What happens |
|---|---|
| **Click a card** | Opens the source URL — Jira ticket, Slack thread, or Google Sheet |
| **Tick the checkbox** | Marks item done and moves it to the Archive tab |
| **Restore from archive** | Moves it back to Active, auto-sorted into the correct priority band |
| **Refresh button** | Manually reloads `data.json` — use this after running `/collect-todo` |

---

## Priority Logic

Priorities are assigned by the collection agent during Step 2. Rules are evaluated top-down — first match wins.

**🔴 High** — any of the following:
- Due date is within 3 days
- Explicit urgency language: *"ASAP", "blocker", "urgent", "critical"*
- Blocking language — someone cannot proceed until you respond: *"waiting for you", "can't proceed", "pending your", "once you confirm"*
- Two or more people in the same thread are all waiting on your response
- An @mention assigned directly to you with no reply visible
- Item has been sitting unanswered for 3+ days (staleness escalation)

**🟡 Medium** — any of the following:
- You are assigned a concrete task with no deadline pressure
- An open comment or ticket is assigned to you
- A direct question was asked but others in the thread are still active (not blocked)

**🟢 Low** — all of the following:
- You are CC'd or mentioned in passing
- No action is strictly required — awareness, FYIs, status updates
- Still surfaces in the active list so you decide whether to act or dismiss

**Discarded entirely** (never added to the list):
- Tickets/comments already marked resolved or closed in the source system
- Automated bot or CI notifications with no human ask

---

## Running the app

```bash
# Start the web app
npm run dev
# → opens at http://localhost:3000

# Collect new action items (run inside Claude Code)
/collect-todo
# → queries Jira, Slack, Gmail, Google Drive
# → merges results into data.json
# → then hit Refresh in the browser
```

---

## Project structure

```
To-Do-Agent/
├── app/
│   ├── page.tsx              # Main dashboard UI
│   └── api/
│       ├── items/route.ts         # GET — read all items
│       ├── items/[id]/route.ts    # PATCH — complete / restore
│       └── refresh/route.ts       # POST — reload data.json
├── lib/
│   └── data.ts               # readDataFile / writeDataFile helpers
├── data.json                 # Live data store (items + archive)
├── WORKFLOW.html             # Visual workflow diagram
└── ACTION_ITEMS_YYYY-MM-DD.md  # Human-readable backup per sync run
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) · TypeScript · Tailwind CSS |
| Data | Local `data.json` — no database needed |
| Integrations | Jira, Slack, Gmail, Google Drive via MCP servers |
| Collection | Claude Code slash command (`/collect-todo`) |
