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
const { normalizeDkPhone } = require("./lead-watcher");
const { isTraining, stripTrigger, loadTraining, saveTraining, applyInstruction } = require("./training");

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

// --- Dublet-beskyttelse: samme besked må aldrig besvares to gange ---
const _seenGuids = new Set();
const _recentContent = new Map();
function isDuplicateMessage(guid, address, text) {
  const now = Date.now();
  if (guid) {
    if (_seenGuids.has(guid)) return true;
    _seenGuids.add(guid);
  }
  const key = address + "|" + text;
  const last = _recentContent.get(key);
  _recentContent.set(key, now);
  if (last && now - last < 90000) return true;   // samme tekst fra samme nr. inden for 90s = dublet
  return false;
}

// --- Håndtér én indgående besked ---
async function onIncoming(address, text, guid) {
  if (!address || !text) return;
  if (isDuplicateMessage(guid, address, text)) {
    console.log(`   ⏭️  Dublet ignoreret (allerede behandlet): ${address}`);
    return;
  }
  console.log(`\n📥 ${address}: ${text}`);

  // Sikkerhed: hvis der er en svar-whitelist, svarer Noah KUN til de numre.
  const wl = cfg.replyWhitelist || [];
  if (wl.length) {
    const norm = normalizeDkPhone(address);
    if (!wl.includes(address) && !wl.includes(norm)) {
      console.log(`   ⏭️  ${address} er ikke på svar-whitelist — Noah svarer ikke (venter på din tilladelse).`);
      return;
    }
  }

  // TRÆNING: en besked fra et whitelistet nummer der starter med "noah:" er en
  // instruktion til at opdatere priser/sprog/tone — ikke en kundesamtale.
  if (isTraining(text)) {
    const instruction = stripTrigger(text);
    console.log(`🎓 Træning fra ${address}: ${instruction}`);
    try {
      const { training, confirmation } = await applyInstruction(loadTraining(), instruction, cfg);
      saveTraining(training);
      await sendIMessage(address, confirmation);
      console.log(`   ✅ Noahs instrukser opdateret.`);
    } catch (e) {
      console.error("❌ Trænings-fejl:", e.message);
      try { await sendIMessage(address, "Beklager, jeg kunne ikke opdatere lige nu — prøv igen om lidt 🙏"); } catch {}
    }
    return;
  }

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
  if (d.isFromMe || d.is_from_me) return null;   // ignorér vores egne (Noahs) beskeder
  const text = d.text || (d.attributedBody && d.attributedBody.string) || "";
  const address = (d.handle && d.handle.address) || d.address
    || (Array.isArray(d.handles) && d.handles[0] && d.handles[0].address) || "";
  if (!text || !address) return null;
  return { address, text: String(text).trim(), guid: d.guid || "" };
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
        console.log(`📨 Webhook: ${body.type || "?"} — ${JSON.stringify(body.data || {}).slice(0, 220)}`);
        const msg = parseBlueBubbles(body);
        if (msg) await onIncoming(msg.address, msg.text, msg.guid);
        else console.log("   (sprunget over — egen besked, eller kunne ikke læse afsender/tekst)");
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
