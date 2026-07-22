/* =============================================================================
   SVEND — iMessage-server
   -----------------------------------------------------------------------------
   "Ørerne" er BlueBubbles (gratis app), der sender indgående iMessages hertil
   som en webhook. Svend svarer kunden og giver mester besked.
   Start med:  node server.js
   ========================================================================== */
const http = require("http");
const path = require("path");
const { TRADES } = require("./trades");
const { handleMessage } = require("./brain");
const { getState, saveState, addLead } = require("./store");
const { sendIMessage } = require("./imessage");

// --- Config ---
let cfg;
try {
  cfg = require("./config.json");
} catch {
  console.error("\n⚠️  Mangler config.json. Kopiér config.example.json til config.json og udfyld den.\n");
  process.exit(1);
}
const trade = TRADES[cfg.tradeKey];
if (!trade) {
  console.error(`⚠️  Ukendt tradeKey "${cfg.tradeKey}". Gyldige: ${Object.keys(TRADES).join(", ")}`);
  process.exit(1);
}

const wait = ms => new Promise(r => setTimeout(r, ms));

// --- Håndtér én indgående besked ---
async function onIncoming(address, text) {
  if (!address || !text) return;
  console.log(`\n📥 ${address}: ${text}`);
  const state = getState(address);

  const out = await handleMessage(state, text, cfg, trade);
  saveState();

  // Svar kunden (lille pause mellem flere bobler, så det føles naturligt)
  for (const reply of out.replies) {
    try {
      await sendIMessage(address, reply);
      console.log(`📤 Svend → ${address}: ${reply.replace(/\n/g, " ")}`);
    } catch (e) {
      console.error("❌ Kunne ikke sende til kunde:", e.message);
    }
    await wait(700);
  }

  // Giv mester besked (akut / booket / tag-besked)
  if (out.ownerNotify && cfg.ownerPhone) {
    try {
      await sendIMessage(cfg.ownerPhone, out.ownerNotify);
      console.log(`🔔 Mester notificeret.`);
    } catch (e) {
      console.error("❌ Kunne ikke sende til mester:", e.message);
    }
  }
  if (out.lead) addLead(out.lead);
}

// --- Træk (address, text) ud af et BlueBubbles-webhook-payload ---
function parseBlueBubbles(body) {
  // BlueBubbles "new-message": { type, data: { text, isFromMe, handle:{address}, ... } }
  const d = (body && body.data) || {};
  if (d.isFromMe) return null;                 // ignorér vores egne (Svends) beskeder
  const text = d.text || (d.attributedBody && d.attributedBody.string) || "";
  const address = (d.handle && d.handle.address) || d.address || "";
  if (!text || !address) return null;
  return { address, text };
}

// --- HTTP-server ---
const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    res.end(`Svend kører ✅  (${cfg.firm} · ${trade.name})\nVenter på iMessages via webhook på POST /webhook`);
    return;
  }
  if (req.method === "POST" && req.url.startsWith("/webhook")) {
    let raw = "";
    req.on("data", c => (raw += c));
    req.on("end", async () => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end('{"ok":true}');           // svar BlueBubbles med det samme
      try {
        const body = JSON.parse(raw || "{}");
        const msg = parseBlueBubbles(body);
        if (msg) await onIncoming(msg.address, msg.text);
      } catch (e) {
        console.error("❌ Fejl i webhook:", e.message);
      }
    });
    return;
  }
  res.writeHead(404); res.end("not found");
});

const PORT = cfg.port || 8787;
server.listen(PORT, () => {
  console.log(`\n🔧 Svend kører for ${cfg.firm} (${trade.name})`);
  console.log(`   Hjerne: ${cfg.useClaude && cfg.anthropicApiKey ? "Claude (" + (cfg.model||"haiku") + ")" : "regelbaseret (gratis)"}`);
  console.log(`   Lytter på http://localhost:${PORT}/webhook`);
  console.log(`   Peg BlueBubbles-webhooken herhen, og skriv en iMessage for at teste.\n`);
});
