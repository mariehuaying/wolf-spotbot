# 🐺 Wolf House SpotBot

A Slack bot that tracks campus sightings and posts a weekly leaderboard.

## How it works
- Post `spot @roommate` (or `spotted`, `SPOT`, etc.) with a photo in **#spotted**
- Bot reacts with 👀📸 and confirms the spot
- Every night at **7PM PT**, the weekly leaderboard posts to **#spotted**

---

## Setup

### 1. Create the Slack App
1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. **Create New App** → **From scratch** → name it "Wolf House SpotBot" → select your workspace
3. Under **OAuth & Permissions** → **Scopes** → add these **Bot Token Scopes**:
   - `chat:write`
   - `reactions:write`
   - `channels:history`
   - `files:read`
4. Under **Socket Mode** → enable it → generate an **App-Level Token** with `connections:write` scope → copy it (this is your `SLACK_APP_TOKEN`)
5. Under **Event Subscriptions** → enable → subscribe to **Bot Events**:
   - `message.channels`
6. **Install App** to your workspace → copy the **Bot Token** (`SLACK_BOT_TOKEN`)
7. Under **Basic Information** → copy the **Signing Secret** (`SLACK_SIGNING_SECRET`)

### 2. Invite the bot to the channel
In Slack, go to **#spotted** and type:
```
/invite @WolfHouseSpotBot
```

### 3. Get the channel ID
Right-click **#spotted** → **View channel details** → copy the ID at the bottom.

### 4. Set up Supabase
Run the SQL in `supabase_migration.sql` in your Supabase SQL editor.
Get your `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` from Project Settings → API.

### 5. Configure environment
```bash
cp .env.example .env
# Fill in all values in .env
```

### 6. Run locally
```bash
npm install
npm start
```

### 7. Deploy (free)
Deploy to [Railway](https://railway.app) or [Render](https://render.com):
- Connect your GitHub repo
- Add all env variables
- Set start command: `npm start`

---

## Leaderboard format
Posted every night at 7PM PT to #spotted:

```
🕵️ Spot Spy Weekly Board

Spot Spy Ranking — who's been watching 👁️
🥇 @marie — 5 spots ✅
🥈 @julio — 3 spots ✅

Most Spotted — who can't hide 🫣  
🥇 @roommate — 5 times 👀
🥈 @sam — 2 times 👀
```
