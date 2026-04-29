# To-Do Agent — Collect Action Items

Use the connected MCP servers (Jira, Slack, Google Drive, Gmail) to aggregate action items for the current user.

**Setup note:** This command uses the project root to locate files. Run it from inside the project directory in Claude Code, or set `PROJECT_ROOT` to the absolute path of your project folder.

**File paths (auto-detected from project root):**
- data.json lives at: `{PROJECT_ROOT}/data.json`
- Output markdown lives at: `{PROJECT_ROOT}/ACTION_ITEMS_[DATE].md`

> To set your project root: find the folder that contains `data.json` and `package.json`. That is your `PROJECT_ROOT`. You can hardcode it here if you prefer — e.g. `/Users/yourname/projects/to-do-agent`.

---

## Step 1 — Load existing data
Read `{PROJECT_ROOT}/data.json`. If the file does not exist, copy `data.template.json` to `data.json` first. Note all existing item IDs in both `items` and `archivedItems` arrays — these must be skipped to avoid duplicates.

## Step 2 — Fetch from all sources in parallel

### Jira
Use the Jira MCP to run these two searches:
1. Issues assigned to the current user that are unresolved and updated in the last 7 days
2. Issues where the current user is mentioned in comments, unresolved, updated in the last 7 days, not assigned to them

For each issue collect: key, summary, status, priority, due date, and the most recent comment that mentions or involves the user. Use that comment's `created` timestamp as `raisedAt` (ISO 8601 UTC). If no comment, fall back to the issue's `updated` timestamp.

### Slack
Use the Slack MCP to run these three searches:
1. Messages that @mention the current user across all channels (last 7 days)
2. Direct messages sent to the current user (last 7 days)
3. Items the user has saved: search with `is:saved` — no date filter, fetch all saved items

For each message collect: channel, sender, message text, timestamp, and thread permalink. Convert `message_ts` to an ISO 8601 UTC string and store it as `raisedAt`.

**Saved items** (`is:saved`) should always be included regardless of age — the user explicitly flagged these themselves. Assign them 🟢 Low priority unless the content contains urgency signals, in which case apply the normal priority rules. Use the `message_ts` of the saved message as `raisedAt`. ID format: `slack-saved-{message_ts}`.

### Google Drive
Use the Google Drive MCP to:
1. Search for documents and spreadsheets modified in the last 7 days
2. Read their content and look for any cells or text mentioning the current user's name or email

For each item collect: file name, link, and the specific cell or text containing the mention.

### Gmail (critical — captures all Google comment @mentions)
Search Gmail using the query: `from:comments-noreply@docs.google.com newer_than:7d`
These emails are Google's notification emails sent whenever someone @mentions or assigns the user in a comment on any Google Sheet, Doc, or Slide.
For each thread found, read the full content and extract:
- The document name and direct link to the comment
- The commenter's name and exact ask
- Whether the comment is still OPEN (skip anything marked as done/resolved)
- The email's `date` header as `raisedAt` (ISO 8601 UTC) — this is when the @mention notification was sent

This source replaces the need to scan Drive files for comments — Gmail captures them all reliably.

## Step 3 — Filter
Remove any item whose ID already exists in `data.json` (in either `items` or `archivedItems`).

## Step 4 — Reason and prioritise

### Priority rules (evaluate in order — first match wins)

**🔴 High** if ANY of the following are true:
- Due date is within 3 days
- Explicit urgency language: "ASAP", "blocker", "urgent", "critical", "blocking", "blocked on"
- Blocking language — someone else cannot proceed until the user responds: "waiting for you", "can't proceed", "can't continue", "need your input to", "once you confirm", "pending your", "holding on"
- 2 or more people in the same thread/ticket are all waiting on the user's response
- A direct question assigned to the user with no reply visible in the thread (unanswered @mention)
- Item is already in the `items` array with `raisedAt` older than 3 days and still unresolved (staleness escalation)

**🟡 Medium** if ANY of the following are true:
- User is assigned a concrete task but no deadline or blocking signal exists
- An open comment or ticket is assigned to the user
- A direct question was asked but others in the thread are still active (not blocked waiting)
- A Jira ticket the user owns needs a status update or decision

**🟢 Low** if:
- User is CC'd / mentioned in passing but no action is strictly required
- Someone shared an update or result for awareness ("looks good", "FYI", status updates)
- The sender is senior (CEO, VP, exec) — even pure FYIs from important people should surface as Low so the user can decide whether to act

**Discard entirely (do not add to items array)** only if:
- The comment or ticket is explicitly marked as resolved/done/closed in the source system
- It is an automated system notification with no human ask (e.g. CI build passed, calendar invite accepted)

### Other reasoning steps
- **The specific ask** — one crisp sentence answering "what does the user need to do?" without having to open the ticket or doc. Be specific: name the person waiting and what they need.
- **Cross-references** — if a Slack message references a Jira ticket key (e.g. APP-1234), group them as one item and set `jiraRef`.
- **Merge related asks** — if multiple messages from the same thread/channel are all waiting on the same answer from the user, combine them into one item with a description that names all the people waiting.

## Step 5 — Write output
Write TWO files to the project root:

### File A — `{PROJECT_ROOT}/data.json` (consumed by the web app at localhost:3000)
Merge the new action items into the existing file at that path. Read the current file first. Add new items to the `items` array (skip any whose `id` already exists in `items` or `archivedItems`). Update `lastSynced` to the current ISO timestamp. Each item must have:
- `createdAt` — set to now (ISO 8601 UTC)
- `raisedAt` — set to the source event timestamp (see Step 2)

Sort the full `items` array: high → medium → low. Preserve all existing `archivedItems` unchanged.

Each item schema:
```json
{
  "id": "string — unique, e.g. jira-123456 or slack-dm-username",
  "source": "jira | slack | gmail | google",
  "priority": "high | medium | low",
  "title": "short label",
  "description": "one sentence: exactly what the user needs to do",
  "url": "deep link back to the source",
  "deadline": "ISO date string or null",
  "jiraRef": "ticket key or null",
  "slackRef": "message_ts or null",
  "raisedAt": "ISO 8601 UTC timestamp",
  "createdAt": "ISO 8601 UTC timestamp"
}
```

### File B — `{PROJECT_ROOT}/ACTION_ITEMS_[TODAY'S DATE].md` (human-readable backup)
```
# Action Items — [DATE]
> [N] items · Jira · Slack · Gmail

## 🔴 High Priority
### 🎯 Jira
- [ ] **[TICKET-KEY] Title** · [link]
  One sentence describing the specific ask.
  ⏰ deadline (if any)

### 💬 Slack
...

### 📧 Gmail
...

## 🟡 Medium Priority
...

## 🟢 Low Priority / FYI
...

---
*Run /collect-todo to refresh.*
```

## Step 6 — Report back
Tell the user:
- How many new items were found per source
- The full path of the written markdown file
- Any sources that were skipped or had errors
- Any items escalated due to staleness
