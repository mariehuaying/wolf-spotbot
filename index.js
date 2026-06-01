require("dotenv").config();
const { App } = require("@slack/bolt");
const cron = require("node-cron");
const { createClient } = require("@supabase/supabase-js");
const ws = require("ws");

// ─── Clients ────────────────────────────────────────────────────────────────
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { global: { fetch: fetch }, realtime: { transport: ws } }
);

// ─── Helpers ─────────────────────────────────────────────────────────────────
const SPOT_REGEX = /\bspot(ted|s|ting)?\b/i;
const SPOTTED_CHANNEL = process.env.SPOTTED_CHANNEL_ID;   // #spotted

function getMondayOfCurrentWeek() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
}

// ─── Listen for spots ────────────────────────────────────────────────────────
app.message(async ({ message, say, client }) => {
  // Only in #spotted channel
  if (message.channel !== SPOTTED_CHANNEL) return;

  const text = message.text || "";
  const hasTrigger = SPOT_REGEX.test(text);
  const mentionMatch = text.match(/<@([A-Z0-9]+)>/);
  const hasPhoto =
    message.files &&
    message.files.some((f) => f.mimetype && f.mimetype.startsWith("image/"));

  if (!hasTrigger || !mentionMatch || !hasPhoto) return;

  const spotterId = message.user;
  const spottedId = mentionMatch[1];

  // Don't let people spot themselves
  if (spotterId === spottedId) {
    await say({
      thread_ts: message.ts,
      text: "👀 You can't spot yourself, sneaky!",
    });
    return;
  }

  // Save to Supabase
  const { error } = await supabase.from("spots").insert({
    spotter_id: spotterId,
    spotted_id: spottedId,
    channel_id: message.channel,
    message_ts: message.ts,
    photo_url: message.files[0].permalink,
    spotted_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Supabase insert error:", error);
    return;
  }

  // Fun confirmation reactions + message
  await client.reactions.add({
    channel: message.channel,
    timestamp: message.ts,
    name: "eyes",
  });
  await client.reactions.add({
    channel: message.channel,
    timestamp: message.ts,
    name: "camera_with_flash",
  });

  await say({
    thread_ts: message.ts,
    text: `📸 Spot confirmed! <@${spotterId}> caught <@${spottedId}> in the wild. This goes on the board! 🕵️`,
  });
});

// ─── Leaderboard builder ─────────────────────────────────────────────────────
async function postLeaderboard() {
  const weekStart = getMondayOfCurrentWeek();

  const { data: spots, error } = await supabase
    .from("spots")
    .select("*")
    .gte("spotted_at", weekStart);

  if (error || !spots || spots.length === 0) {
    await app.client.chat.postMessage({
      channel: SPOTTED_CHANNEL,
      text: "🕵️ *Spot Spy Weekly Board* — No spots this week yet. Get out there!",
    });
    return;
  }

  // Count spies (who spotted most)
  const spyCounts = {};
  const victimCounts = {};
  for (const s of spots) {
    spyCounts[s.spotter_id] = (spyCounts[s.spotter_id] || 0) + 1;
    victimCounts[s.spotted_id] = (victimCounts[s.spotted_id] || 0) + 1;
  }

  const topSpies = Object.entries(spyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topVictims = Object.entries(victimCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

  const spyLines = topSpies
    .map(([ id, count], i) => `${medals[i]} <@${id}> — ${count} spot${count > 1 ? "s" : ""} ✅`)
    .join("\n");

  const victimLines = topVictims
    .map(([id, count], i) => `${medals[i]} <@${id}> — spotted ${count} time${count > 1 ? "s" : ""} 👀`)
    .join("\n");

  await app.client.chat.postMessage({
    channel: SPOTTED_CHANNEL,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🕵️ Spot Spy Weekly Board",
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Spot Spy Ranking* — who's been watching 👁️\n${spyLines}`,
        },
      },
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Most Spotted* — who can't hide 🫣\n${victimLines}`,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Week of ${new Date(weekStart).toLocaleDateString("en-US", { month: "long", day: "numeric" })} · ${spots.length} total spot${spots.length > 1 ? "s" : ""}`,
          },
        ],
      },
    ],
    text: "🕵️ Spot Spy Weekly Board",
  });
}

// ─── Schedule: every day at 7PM PT (= 2AM UTC next day in winter, 3AM in summer)
// Using America/Los_Angeles: 19:00
cron.schedule("0 19 * * *", postLeaderboard, {
  timezone: "America/Los_Angeles",
});

// ─── Health-check server (Railway requires a bound port) ─────────────────────
const http = require("http");
http
  .createServer((_, res) => res.end("ok"))
  .listen(process.env.PORT || 3000);

// ─── Start ───────────────────────────────────────────────────────────────────
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
  process.exit(1);
});

(async () => {
  await app.start();
  console.log("🐺 Wolf House SpotBot is running!");
})();
