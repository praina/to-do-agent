# To-Do Agent

A personal action-item aggregator that pulls your open tasks from Jira, Slack, Gmail, and Google Drive into a single prioritised web app — so you always know what needs your attention and who is waiting on you.

> **New here?** Follow the [Setup](#setup) section below — every step is written out plainly. You can also hand this whole file to an AI assistant and say: *"Please read this and walk me through each step one at a time."*

---

## What it does

Every time you run `/collect-todo` inside Claude Code, the agent scans your connected tools, finds everything that requires action from you, prioritises it, and writes it to a local web app running at `localhost:3000`. Items survive across sessions in a `data.json` file — ticking one off archives it, and you can restore it if needed.

---

## Setup

### What you need before starting

**1. Node.js (version 18 or higher)**

Open Terminal and type:
```
node --version
```
If you see a number like `v20.x.x` you are fine. If you get an error, go to https://nodejs.org and download the LTS version.

**2. Claude Code + a Claude Pro or Team account**

In Terminal, type:
```
claude --version
```
If you get an error, go to https://claude.ai/code and follow the install instructions. You also need an active Claude subscription — the free tier does not support Claude Code.

---

### Step 1 — Download the project

```bash
cd ~/Desktop
git clone https://github.com/praina/to-do-agent.git
cd to-do-agent
```

---

### Step 2 — Install dependencies

```bash
npm install
```

This downloads everything the web app needs. It might take a minute.

---

### Step 3 — Create your data file

```bash
cp data.template.json data.json
```

This creates your local data file pre-loaded with sample items so you can see the app working immediately. It stays on your computer only — it is in `.gitignore` so it will never be accidentally uploaded. Replace the contents after your first `/collect-todo` run.

---

### Step 4 — Connect your tools using Claude Integrations

This is the most important step. Claude has a built-in **Integrations** feature that connects to Slack, Jira, Gmail, and Google Drive for you — no API tokens, no credentials files, no code. You just click and log in.

**How to open it:**
1. Go to **https://claude.ai** in your browser and log in
2. Click your profile picture or initials in the top-right corner
3. Click **"Customize Claude"** → look for **Integrations** or **Connections**
4. You will see a list of apps you can connect

> Can't find it? Try going directly to https://claude.ai/settings/integrations

**Connect Slack:** Find Slack → click Connect → log in to your Slack workspace → click Allow.

**Connect Jira:** Find Jira (or Atlassian) → click Connect → log in with your Atlassian account → click Accept.

**Connect Gmail:** Find Gmail → click Connect → sign in with your work Google account → click Allow.

**Connect Google Drive:** Find Google Drive → click Connect → sign in with the same Google account → click Allow.

Once done, all four should show as connected:
- ✅ Slack
- ✅ Jira / Atlassian
- ✅ Gmail
- ✅ Google Drive

These connections work automatically in Claude Code too — nothing else to link.

---

### Step 5 — Install the `/collect-todo` slash command

```bash
mkdir -p ~/.claude/commands
cp .claude/commands/collect-todo.md ~/.claude/commands/collect-todo.md
```

**Tell the command who you are.** Open the file you just copied:

```bash
open ~/.claude/commands/collect-todo.md
```

Add two lines at the very top of the file so the agent knows whose messages and tickets to look for:

```
<!-- USER_NAME: Your Full Name -->
<!-- USER_EMAIL: you@yourcompany.com -->
```

Use the name and email you log in to Slack and Jira with. Save the file.

---

### Step 6 — Start the web app

```bash
npm run dev
```

You should see:
```
▲ Next.js 15.x.x
- Local:    http://localhost:3000
```

Open **http://localhost:3000** in your browser. You will see an empty dashboard — that is correct. Items appear after your first `/collect-todo` run. Keep this Terminal window open.

---

### Step 7 — Run your first collection

Open a new Terminal window, go to the project folder, and open Claude Code:

```bash
cd ~/Desktop/to-do-agent
claude
```

Once Claude Code is ready (you will see a `>` prompt), type:

```
/collect-todo
```

Claude will scan Jira, Slack, Gmail, and Google Drive. This takes 1–2 minutes. When it finishes you will see a summary like:

```
✅ Done — 12 new items found
   Jira: 2 · Slack: 7 · Gmail: 3 · Google Drive: 0
```

Go to **http://localhost:3000** and click **Refresh**. Your action items will appear, sorted by priority.

---

### Step 8 — Using the dashboard

| What you want to do | How |
|---|---|
| Open the original Slack message, Jira ticket, or Google doc | Click anywhere on a card |
| Mark something as done | Tick the checkbox on the card |
| Undo a completed item | Go to the **Archive** tab and click the ↩ button |
| Pick up new items after running `/collect-todo` | Click the **Refresh** button (top right) |
| Run a fresh collection | Type `/collect-todo` in Claude Code |

The dashboard also silently refreshes every 3 minutes in the background.

---

### Troubleshooting

**Claude Code says the integrations are not connected**
Make sure you connected them on **claude.ai** while logged in with the same account you use for Claude Code.

**`/collect-todo` command not found**
Check that the file exists: `ls ~/.claude/commands/collect-todo.md`. If it says "No such file", run the copy command in Step 5 again.

**No items found from a particular tool**
- **Slack:** Make sure the Integration was connected with an account that has access to the channels you care about.
- **Jira:** Check you are logged in to the right Atlassian account — the one your company uses, not a personal one.
- **Gmail:** The search looks for notification emails from `comments-noreply@docs.google.com`. If you don't use Google Docs/Sheets at work, nothing will show from Gmail.

**The web app shows an error page**
Make sure `npm run dev` is still running in a Terminal window.

---

## How it works

### Data sources

| Source | What it captures |
|---|---|
| 🎯 **Jira** | Tickets assigned to you · Issues where you are mentioned in comments (last 7 days) |
| 💬 **Slack** | Channel @mentions · Direct messages (last 24 hours) · Saved items (all, any age) |
| 📧 **Gmail** | Google Docs/Sheets comment notifications — whenever someone @mentions or assigns you (last 7 days) |
| 📄 **Google Drive** | Files where your name or email appears (last 7 days) |

> **Why Gmail for Google comments?** Google sends a notification email every time someone @mentions you in a Sheet, Doc, or Slide comment. Reading these emails is more reliable than scanning Drive files directly.

> **Why only 24 hours for Slack @mentions?** If a mention from 3+ days ago wasn't deliberately saved, it was likely already handled. Saved items (your intentional backlog) are always included regardless of age.

---

### Priority logic

Rules are evaluated top-down — first match wins.

**🔴 High** — any of the following:
- Due date is within 3 days
- Explicit urgency language: *"ASAP", "blocker", "urgent", "critical"*
- Blocking language — someone cannot proceed until you respond: *"waiting for you", "can't proceed", "pending your", "once you confirm"*
- Two or more people in the same thread are all waiting on your response
- An @mention assigned directly to you with no reply visible
- A @mention or DM has been sitting unanswered for 3+ days (staleness escalation)

**🟡 Medium** — any of the following:
- You are assigned a concrete task with no deadline pressure
- An open comment or ticket is assigned to you
- A direct question was asked but others in the thread are still active

**🟢 Low** — FYIs and awareness items:
- You are CC'd or mentioned in passing
- No action is strictly required — status updates, informational messages
- Senior person (CEO, VP) shared something — surfaces so you can decide whether to act

**Discarded entirely:**
- Tickets/comments already marked resolved or closed
- Automated bot notifications with no human ask

---

### Data store (`data.json`)

All items live in a single JSON file at the project root:

```
data.json
├── items[]          Active items, sorted high → medium → low
├── archivedItems[]  Completed items, newest first
└── lastSynced       ISO timestamp of the last /collect-todo run
```

Each item carries: `id`, `source`, `priority`, `title`, `description`, `url`, `raisedAt`, `jiraRef`, `deadline`, `quote` (verbatim text from the source), `quoteAuthor` (who said it and where).

---

### Project structure

```
to-do-agent/
├── app/
│   ├── page.tsx                    # Main dashboard UI
│   └── api/
│       ├── items/route.ts          # GET — read all items
│       ├── items/[id]/route.ts     # PATCH — complete / restore
│       └── refresh/route.ts        # POST — reload data.json
├── lib/
│   └── data.ts                     # readDataFile / writeDataFile helpers
├── .claude/
│   └── commands/
│       └── collect-todo.md         # The /collect-todo slash command definition
├── data.template.json              # Demo template with sample items — copy to data.json to try the app instantly
└── ACTION_ITEMS_YYYY-MM-DD.md      # Human-readable backup per sync run (git-ignored)
```

---

### Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 · TypeScript · Tailwind CSS |
| Data | Local `data.json` — no database needed |
| Integrations | Jira, Slack, Gmail, Google Drive via Claude Integrations |
| Collection | Claude Code slash command (`/collect-todo`) |
