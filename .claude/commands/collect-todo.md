# To-Do Agent — Collect Action Items

Use the connected MCP servers (Jira, Slack, Google Drive, Gmail) to aggregate your action items.

**All file paths are relative to the project root.**
- data.json lives at: `./data.json`
- Output markdown lives at: `./ACTION_ITEMS_[DATE].md`

## Step 1 — Load existing data
Read `./data.json`. Note all existing item IDs in both `items` and `archivedItems` arrays — these must be skipped to avoid duplicates.

## Step 2 — Fetch from all sources in parallel

### Jira
Use the Jira MCP to run these two searches:
1. Issues assigned to the current user that are unresolved and updated in the last 7 days
2. Issues where the current user is mentioned in comments, unresolved, updated in the last 7 days, not assigned to them

For each issue collect: key, summary, status, priority, due date, and the most recent comment that mentions or involves the user. Use that comment's `created` timestamp as `raisedAt` (ISO 8601 UTC). If no comment, fall back to the issue's `updated` timestamp.

**Evidence fields (required):**
- `quote`: the full body text of the most recent comment that mentions or involves the user. If no comment, use the issue description (truncated to 400 chars). This is the actual words someone wrote — copy verbatim, do not paraphrase.
- `quoteAuthor`: formatted as `"[Author display name] · [TICKET-KEY] · [date e.g. Apr 17]"`

### Slack
Use the Slack MCP to run these three searches:
1. Messages that @mention the current user across all channels (**last 24 hours only**)
2. Direct messages sent to the current user (**last 24 hours only**)
3. Items the user has saved: search with `is:saved` — no date filter, fetch all saved items

For each message collect: channel, sender, message text, timestamp, and thread link. Convert `message_ts` to an ISO 8601 UTC string and store it as `raisedAt`.

**Why 24 hours for @mentions and DMs?** If a mention from 3+ days ago wasn't saved, it was already handled or not worth tracking. The saved list is the deliberate backlog.

**Saved items** (`is:saved`) should always be included regardless of age — the user explicitly flagged these themselves. Assign them 🟢 Low priority unless the content contains urgency signals, in which case apply the normal priority rules. Use the `message_ts` of the saved message as `raisedAt`. ID format: `slack-saved-{message_ts}`.

**Evidence fields (required):**
- `quote`: the exact text of the Slack message (or the most relevant message in the thread if merging multiple). Copy verbatim, do not summarise. Truncate at 500 chars if very long.
- `quoteAuthor`: formatted as `"[Sender display name] · #[channel-name] · [date e.g. Apr 17]"`. For DMs omit the channel and use `"[Sender display name] · Direct message · [date]"`.

### Google Drive
Use the Google Drive MCP to:
1. Search for documents and spreadsheets modified in the last 7 days
2. Read their content and look for any cells or text mentioning your name or username

For each item collect: file name, link, and the specific cell or text containing the mention.

**Evidence fields (required):**
- `quote`: the exact cell value or paragraph text that contains the mention. Copy verbatim.
- `quoteAuthor`: formatted as `"[File name] · [sheet or section name if available] · [date modified e.g. Apr 17]"`

### Gmail (critical — captures all Google comment @mentions)
Search Gmail using the query: `from:comments-noreply@docs.google.com newer_than:7d`
These emails are Google's notification emails sent whenever someone @mentions or assigns you in a comment on any Google Sheet, Doc, or Slide.
For each thread found, read the full content and extract:
- The document name and direct link to the comment
- The commenter's name and exact ask
- Whether the comment is still OPEN (skip anything marked as done/resolved)
- The email's `date` header as `raisedAt` (ISO 8601 UTC) — this is when the @mention notification was sent

This source replaces the need to scan Drive files for comments — Gmail captures them all reliably.

**Evidence fields (required):**
- `quote`: the exact comment text from the email body (the words the commenter actually typed in the Google Doc/Sheet/Slide). Copy verbatim, not the email wrapper text — just the comment itself.
- `quoteAuthor`: formatted as `"[Commenter name] · [Document name] · [date e.g. Apr 17]"`

## Step 3 — Filter
Remove any item whose ID already exists in `storage.json` seenIds.

## Step 4 — Reason and prioritise

### Priority rules (evaluate in order — first match wins)

**🔴 High** if ANY of the following are true:
- Due date is within 3 days
- Explicit urgency language: "ASAP", "blocker", "urgent", "critical", "blocking", "blocked on"
- Blocking language — someone else cannot proceed until you respond: "waiting for you", "can't proceed", "can't continue", "need your input to", "once you confirm", "pending your", "holding on"
- 2 or more people in the same thread/ticket are all waiting on your response
- A direct question assigned to you with no reply visible in the thread (unanswered @mention)
- Item is a **@mention or DM** (not a saved item) already in the `items` array with `raisedAt` older than 3 days and still unresolved (staleness escalation — saved items are exempt)

**🟡 Medium** if ANY of the following are true:
- You are assigned a concrete task but no deadline or blocking signal exists
- An open comment or ticket is assigned to you
- A direct question was asked but others in the thread are still active (not blocked waiting)
- A Jira ticket you own needs a status update or decision

**🟢 Low** if:
- You are CC'd / mentioned in passing but no action is strictly required
- Someone shared an update or result for awareness ("looks good", "FYI", status updates)
- The sender is senior (CEO, VP, exec) — even pure FYIs from important people should surface as Low so you can decide whether to act

**Discard entirely (do not add to items array)** only if:
- The comment or ticket is explicitly marked as resolved/done/closed in the source system
- It is an automated system notification with no human ask (e.g. CI build passed, calendar invite accepted)

### Other reasoning steps
- **The specific ask** — one crisp sentence answering "what do you need to do?" without having to open the ticket or doc. Be specific: name the person waiting and what they need.
- **Cross-references** — if a Slack message references a Jira ticket key (e.g. PROJ-1234), group them as one item and set `jiraRef`.
- **Merge related asks** — if multiple messages from the same thread/channel are all waiting on the same answer from you, combine them into one item with a description that names all the people waiting.

## Step 5 — Write output
Write TWO files to the project root:

### File A — ./data.json (consumed by the web app)
Merge the new action items into the existing file. Read the current file first. Add new items to the `items` array (skip any whose `id` already exists in `items` or `archivedItems`). Update `lastSynced` to the current ISO timestamp. Each item must have `createdAt` set to now and `raisedAt` set to the source event timestamp (see Step 2 — each source specifies how to extract this). Preserve all existing `archivedItems` unchanged.

Each item in the `items` array must include these fields:
```json
{
  "id": "...",
  "source": "slack|jira|gmail|google",
  "priority": "high|medium|low",
  "title": "...",
  "description": "One crisp sentence: what do you need to do?",
  "url": "direct link to the source item",
  "raisedAt": "ISO 8601 UTC timestamp of the source event",
  "createdAt": "ISO 8601 UTC timestamp of now",
  "quote": "Verbatim text of the original message/comment/cell — the real evidence",
  "quoteAuthor": "Author name · source location · date"
}
```
`quote` and `quoteAuthor` are **required** — the web app shows a placeholder when they're missing. Do not leave them empty.

### File B — ./ACTION_ITEMS_[TODAY'S DATE].md (human-readable backup)
Write this markdown file to the project root with this structure:

```
# Action Items — [DATE]
> [N] items · Jira · Slack · Google Drive

## 🔴 High Priority
### 🎯 Jira
- [ ] **[TICKET-KEY] Title** · [link]
  One sentence describing the specific ask.
  ⏰ deadline (if any)

### 💬 Slack
...

### 📄 Google Drive
...

## 🟡 Medium Priority
...

## 🟢 Low Priority / FYI
...

---
*Run /collect-todo to refresh.*
```

## Step 6 — Update storage.json
Add all newly processed item IDs to the appropriate array in `storage.json` and update the `lastRun` timestamp. This prevents duplicates on the next run.

## Step 7 — Report back
Tell the user:
- How many items were found per source
- The file path of the written markdown
- Any sources that were skipped or had errors
