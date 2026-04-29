# To-Do Agent — Setup Guide

> **Who is this for?** Anyone who just downloaded this project and wants to get it running. Every single step is written out. Nothing is assumed. If you are using an AI assistant to help you set this up, share this entire file with them and say: *"Please follow this setup guide and help me complete each step."*

---

## What this project does

This is a personal dashboard that automatically collects everything that needs your attention across Jira, Slack, Gmail, and Google Drive — and shows it in one prioritised web app running on your computer.

You run one command (`/collect-todo`) inside Claude Code and it scans all your tools, finds open action items, and loads them into a local website at `http://localhost:3000`.

---

## What you need before starting

You need four things installed on your computer. Check each one:

**1. Node.js (version 18 or higher)**
Open your Terminal and type:
```
node --version
```
If you see a number like `v20.x.x` you are fine. If you get an error, go to https://nodejs.org and download the LTS version.

**2. Claude Code (the command-line tool)**
In your Terminal, type:
```
claude --version
```
If you get an error, go to https://claude.ai/code and follow the install instructions.

**3. Python's `uvx` tool (needed for the Jira connector)**
In your Terminal, type:
```
uvx --version
```
If you get an error, run this to install it:
```
curl -LsSf https://astral.sh/uv/install.sh | sh
```
Then close and reopen your Terminal and try `uvx --version` again.

**4. A Claude Pro or Claude Team account**
The `/collect-todo` command runs inside Claude Code and uses AI to read and prioritise your items. You need an active Claude subscription.

---

## Step 1 — Download the project

Open your Terminal. Decide where you want to put this project. A good place is your Desktop or a Projects folder.

```bash
cd ~/Desktop
git clone https://github.com/YOUR_USERNAME/to-do-agent.git
cd to-do-agent
```

*(Replace `YOUR_USERNAME` with the actual GitHub username of whoever shared this with you.)*

You should now be inside the project folder.

---

## Step 2 — Install the app's dependencies

Still in your Terminal, inside the project folder, run:

```bash
npm install
```

This downloads everything the web app needs. It might take a minute. When it finishes, you are ready.

---

## Step 3 — Create your data file

The project comes with an empty template. Copy it to create your live data file:

```bash
cp data.template.json data.json
```

This creates a blank `data.json` file where all your action items will be stored. **Never commit this file to Git — it contains your personal work items.**

---

## Step 4 — Set up your credentials file

The app needs credentials for Slack, Jira, Gmail, and Google Drive. We store these in a `.env` file — a plain text file that lives only on your computer and is never uploaded anywhere.

Create a file called `.env` in the project root:

```bash
touch .env
```

Open it in any text editor (TextEdit, VS Code, Notepad — anything). You will fill it in during the steps below. It will end up looking like this:

```
SLACK_USER_TOKEN=xoxp-...
SLACK_TEAM_ID=T...
JIRA_URL=https://yourcompany.atlassian.net
JIRA_USERNAME=you@yourcompany.com
JIRA_API_TOKEN=...
CONFLUENCE_URL=https://yourcompany.atlassian.net/wiki
GDRIVE_CREDENTIALS_FILE=/Users/yourname/Desktop/to-do-agent/google-credentials.json
GDRIVE_TOKEN_FILE=/Users/yourname/Desktop/to-do-agent/google-token.json
GMAIL_CREDENTIALS_FILE=/Users/yourname/Desktop/to-do-agent/google-credentials.json
GMAIL_TOKEN_FILE=/Users/yourname/Desktop/to-do-agent/google-token.json
```

Do not fill anything in yet. Follow the steps below to get each value.

---

## Step 5 — Get your Slack credentials

You need two things from Slack: a **User Token** and your **Team ID**.

### Get your Slack User Token

1. Go to https://api.slack.com/apps and click **Create New App**
2. Choose **From scratch**
3. Give it any name (e.g. "My To-Do Agent") and select your Slack workspace
4. On the left sidebar, click **OAuth & Permissions**
5. Scroll down to **User Token Scopes** (not Bot Token Scopes — the *User* one). Add these scopes one by one:
   - `channels:history`
   - `channels:read`
   - `groups:history`
   - `groups:read`
   - `im:history`
   - `im:read`
   - `mpim:history`
   - `mpim:read`
   - `search:read`
   - `bookmarks:read`
6. Scroll back to the top of the **OAuth & Permissions** page and click **Install to Workspace**
7. Click **Allow**
8. Copy the **User OAuth Token** — it starts with `xoxp-`

Paste it into your `.env` file next to `SLACK_USER_TOKEN=`.

### Get your Slack Team ID

1. Open Slack in your browser (not the app)
2. Look at the URL — it looks like `https://app.slack.com/client/T01ABCDEF/...`
3. The part that starts with `T` and has letters and numbers after it is your Team ID

Paste it into your `.env` file next to `SLACK_TEAM_ID=`.

---

## Step 6 — Get your Jira credentials

You need three things: your **Jira URL**, your **email address**, and an **API Token**.

### Get your Jira API Token

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click **Create API token**
3. Give it a name like "To-Do Agent" and click **Create**
4. Copy the token shown — you will only see it once

Now fill in your `.env` file:
- `JIRA_URL` = your company's Jira URL, e.g. `https://yourcompany.atlassian.net`
- `JIRA_USERNAME` = the email address you use to log in to Jira
- `JIRA_API_TOKEN` = the token you just copied
- `CONFLUENCE_URL` = usually the same as your Jira URL but with `/wiki` added, e.g. `https://yourcompany.atlassian.net/wiki`

---

## Step 7 — Get your Google credentials (Gmail + Google Drive)

Gmail and Google Drive share the same Google credentials. You do this once and it covers both.

### Create a Google Cloud project

1. Go to https://console.cloud.google.com
2. At the top, click the project dropdown and click **New Project**
3. Name it "To-Do Agent" and click **Create**
4. Make sure your new project is selected in the dropdown

### Enable the APIs

1. In the left menu, go to **APIs & Services → Library**
2. Search for **Gmail API** and click **Enable**
3. Search for **Google Drive API** and click **Enable**

### Create OAuth credentials

1. Go to **APIs & Services → OAuth consent screen**
2. Choose **External** and click **Create**
3. Fill in the required fields (App name: "To-Do Agent", your email for support and developer contact). Click **Save and Continue** through all the screens.
4. On the **Scopes** screen, click **Add or Remove Scopes** and add:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/drive.readonly`
5. Click **Save and Continue**, then on **Test users** add your own Google email address
6. Go to **APIs & Services → Credentials**
7. Click **Create Credentials → OAuth client ID**
8. Choose **Desktop app** as the application type
9. Click **Create**, then **Download JSON**
10. Rename the downloaded file to `google-credentials.json`
11. Move it into the project folder (the same folder as `data.json`)

### Fill in your .env file

Replace `yourname` and the path with your actual username and project location:
```
GDRIVE_CREDENTIALS_FILE=/Users/yourname/Desktop/to-do-agent/google-credentials.json
GDRIVE_TOKEN_FILE=/Users/yourname/Desktop/to-do-agent/google-token.json
GMAIL_CREDENTIALS_FILE=/Users/yourname/Desktop/to-do-agent/google-credentials.json
GMAIL_TOKEN_FILE=/Users/yourname/Desktop/to-do-agent/google-token.json
```

`google-token.json` does not exist yet — it gets created automatically the first time you authorise the app (in Step 9 below).

---

## Step 8 — Connect the MCP servers to Claude Code

MCP servers are plugins that let Claude Code talk to Slack, Jira, and Google on your behalf. You need to add them to Claude Code.

Open your Terminal and run these commands **one at a time**. Each one registers a connector:

### Add the Slack connector
```bash
claude mcp add slack \
  -e SLACK_USER_TOKEN="$(grep SLACK_USER_TOKEN .env | cut -d= -f2)" \
  -e SLACK_TEAM_ID="$(grep SLACK_TEAM_ID .env | cut -d= -f2)" \
  -- npx -y @modelcontextprotocol/server-slack
```

### Add the Jira/Atlassian connector
```bash
claude mcp add atlassian \
  -e JIRA_URL="$(grep JIRA_URL .env | grep -v CONFLUENCE | cut -d= -f2)" \
  -e JIRA_USERNAME="$(grep JIRA_USERNAME .env | cut -d= -f2)" \
  -e JIRA_API_TOKEN="$(grep JIRA_API_TOKEN .env | cut -d= -f2)" \
  -e CONFLUENCE_URL="$(grep CONFLUENCE_URL .env | cut -d= -f2)" \
  -- uvx mcp-atlassian --transport stdio
```

### Add the Google Drive connector
```bash
claude mcp add gdrive \
  -e GDRIVE_CREDENTIALS_FILE="$(grep GDRIVE_CREDENTIALS_FILE .env | cut -d= -f2)" \
  -e GDRIVE_TOKEN_FILE="$(grep GDRIVE_TOKEN_FILE .env | cut -d= -f2)" \
  -- npx -y @modelcontextprotocol/server-gdrive
```

### Add the Gmail connector
```bash
claude mcp add gmail \
  -e GMAIL_CREDENTIALS_FILE="$(grep GMAIL_CREDENTIALS_FILE .env | cut -d= -f2)" \
  -e GMAIL_TOKEN_FILE="$(grep GMAIL_TOKEN_FILE .env | cut -d= -f2)" \
  -- npx -y @modelcontextprotocol/server-gmail
```

### Verify they were added
```bash
claude mcp list
```

You should see `slack`, `atlassian`, `gdrive`, and `gmail` in the list.

---

## Step 9 — Authorise Google (one-time step)

The first time Claude Code tries to use Gmail or Google Drive, it needs you to authorise it in your browser.

Open Claude Code from the project folder:
```bash
claude
```

Then type this message:
```
Use the gdrive MCP to list recent files in my Google Drive.
```

A browser window will open asking you to sign in to Google and grant permission. Sign in, click **Allow**, and you will see a confirmation screen. This creates the `google-token.json` file automatically.

You only need to do this once.

---

## Step 10 — Install the `/collect-todo` slash command

The `/collect-todo` command needs to live in a special folder so Claude Code can find it.

Run this in your Terminal from inside the project folder:

```bash
mkdir -p ~/.claude/commands
cp .claude/commands/collect-todo.md ~/.claude/commands/collect-todo.md
```

### Edit the command with your own details

Open `~/.claude/commands/collect-todo.md` in any text editor and make two changes:

**1. Replace `{PROJECT_ROOT}` with your actual project path.**
Find every occurrence of `{PROJECT_ROOT}` and replace it with the full path to your project folder, for example:
```
/Users/yourname/Desktop/to-do-agent
```

**2. Add your name and email at the top** (so the AI knows whose items to look for):
At the very top of the file, add these two lines:
```
<!-- USER_NAME: Your Full Name -->
<!-- USER_EMAIL: you@yourcompany.com -->
```

Replace with your actual name and email as they appear in Slack and Jira.

---

## Step 11 — Start the web app

In your Terminal, from the project folder, run:

```bash
npm run dev
```

You should see:
```
▲ Next.js 15.x.x
- Local: http://localhost:3000
```

Open http://localhost:3000 in your browser. You will see an empty dashboard — that is correct. It is waiting for your first `/collect-todo` run.

Leave this Terminal window running. Open a new Terminal window for the next step.

---

## Step 12 — Run your first collection

Open Claude Code from inside the project folder:

```bash
cd ~/Desktop/to-do-agent
claude
```

Once Claude Code is open, type:

```
/collect-todo
```

Claude will now scan Jira, Slack, Gmail, and Google Drive. This takes about 1–2 minutes. When it finishes, it will tell you how many items it found from each source.

Go back to http://localhost:3000 in your browser and click the **Refresh** button. Your action items will appear, sorted by priority.

---

## Step 13 — Using the dashboard

| Action | How |
|---|---|
| **Open the original message** | Click anywhere on a card |
| **Mark something as done** | Tick the checkbox on the card |
| **Restore a completed item** | Go to the Archive tab and click the ↩ button |
| **Refresh after a new collection** | Click the Refresh button (top right) |
| **Run a fresh collection** | Type `/collect-todo` in Claude Code |

The dashboard also auto-refreshes silently every 3 minutes in the background.

---

## Troubleshooting

**"No results" from Slack**
Make sure your Slack app has *User Token Scopes*, not Bot Token Scopes. The token must start with `xoxp-`, not `xoxb-`.

**Jira returns an error**
Double-check that `JIRA_URL` does not have a trailing slash — it should be `https://yourcompany.atlassian.net`, not `https://yourcompany.atlassian.net/`.

**Google Drive / Gmail asks to authorise again**
Delete `google-token.json` from the project folder and repeat Step 9.

**`/collect-todo` command not found**
Make sure you copied the file to `~/.claude/commands/` (with the tilde — that means your home folder) and that you replaced `{PROJECT_ROOT}` inside the file.

**The web app shows an error**
Make sure `npm run dev` is still running in a Terminal window. It needs to stay open while you use the dashboard.

---

## Quick-start prompt for your AI assistant

If you want an AI assistant to help you complete this setup, paste the contents of this entire file into a new conversation and then say:

> *"I have just cloned the to-do-agent project. Please read this setup guide carefully and walk me through each step one at a time, starting from Step 1. Ask me for confirmation before moving to the next step, and tell me exactly what to type or click at each point."*

The AI will guide you through every step interactively.

---

## Recap — what you installed and why

| Thing | What it is | Why you need it |
|---|---|---|
| `npm install` | Web app dependencies | Runs the Next.js dashboard |
| `data.json` | Your personal data store | Holds all your action items locally |
| `google-credentials.json` | Google OAuth config | Lets the app read your Gmail and Drive |
| MCP servers (×4) | Connectors for each tool | Let Claude Code talk to Slack, Jira, Gmail, Drive |
| `~/.claude/commands/collect-todo.md` | The slash command | Tells Claude exactly how to collect and prioritise items |

