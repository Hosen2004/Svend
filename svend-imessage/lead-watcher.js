/* =============================================================================
   LEAD-VAGT — tjekker Monday for nye leads og sender Noah-beskeden 4 min efter.
   Sikkerhed: reagerer KUN på leads oprettet efter start (aldrig backlog),
   tør-test som standard, og whitelist over tilladte numre.
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const { getNewLeadIds, getLeadDetails } = require("./monday");
const { sendIMessage } = require("./imessage");

const PFILE = path.join(__dirname, "data", "monday-processed.json");
function loadProcessed() { try { return new Set(JSON.parse(fs.readFileSync(PFILE, "utf8"))); } catch { return new Set(); } }
function saveProcessed(set) {
  try { fs.mkdirSync(path.dirname(PFILE), { recursive: true }); fs.writeFileSync(PFILE, JSON.stringify([...set], null, 2)); }
  catch (e) { console.error("[Lead-vagt] Kunne ikke gemme:", e.message); }
}

/* ---------- rene hjælpe-funktioner (testbare) ---------- */
function firstName(name) {
  const n = (name || "").trim().split(/\s+/)[0] || "der";
  return n.charAt(0).toUpperCase() + n.slice(1);
}
function normalizeDkPhone(raw) {
  let p = (raw || "").replace(/[^\d+]/g, "");
  if (!p) return "";
  if (p.startsWith("+")) return p;
  if (p.startsWith("45") && p.length === 10) return "+" + p;
  if (p.length === 8) return "+45" + p;
  return "+" + p;
}
function buildMessage(tmpl, name) {
  return tmpl.replace(/\{\{\s*navn\s*\}\}/gi, firstName(name));
}

/* Beslutning pr. lead — ren funktion, nem at teste. */
function decide(lead, ctx) {
  const createdMs = Date.parse(lead.createdAt);
  if (isNaN(createdMs)) return { action: "ignore", reason: "ugyldig dato" };
  if (createdMs < ctx.startMs) return { action: "ignore", reason: "backlog (oprettet før start)" };
  if (ctx.processed.has(String(lead.id))) return { action: "ignore", reason: "allerede kontaktet" };
  const phone = normalizeDkPhone(lead.phone);
  if (!phone) return { action: "skip", reason: "mangler telefonnummer" };
  if (ctx.nowMs - createdMs < ctx.delayMs) return { action: "wait", reason: "venter på de 4 minutter" };
  if (ctx.allowed && ctx.allowed.length && !ctx.allowed.includes(phone))
    return { action: "blocked", phone, reason: "nummer ikke på whitelist — venter på din tilladelse" };
  return { action: "send", phone, reason: "klar" };
}

/* ---------- selve tjekket (kaldes med interval) ---------- */
async function tick(cfg, state) {
  const fromISO = new Date(state.startMs).toISOString();
  const ids = await getNewLeadIds(cfg, fromISO);
  if (!ids.length) return;
  const leads = await getLeadDetails(cfg, ids);
  const now = Date.now();
  const delayMs = (cfg.monday.delayMinutes || 4) * 60000;

  for (const lead of leads) {
    const d = decide(lead, {
      nowMs: now, startMs: state.startMs, delayMs,
      processed: state.processed, allowed: cfg.monday.allowedNumbers,
    });

    if (d.action === "send") {
      const msg = buildMessage(cfg.followupMessage, lead.name);
      if (cfg.monday.dryRun) {
        console.log(`🧪 [TØR-TEST] Ville sende til ${lead.name} (${d.phone}):\n   "${msg}"`);
      } else {
        try {
          await sendIMessage(d.phone, msg);
          console.log(`📤 Sendt til ${lead.name} (${d.phone})`);
        } catch (e) { console.error(`❌ Kunne ikke sende til ${lead.name}:`, e.message); continue; }
      }
      state.processed.add(String(lead.id));
      saveProcessed(state.processed);
    } else if (d.action === "blocked" || d.action === "skip") {
      if (!state.logged.has(lead.id)) {
        console.log(`⏭️  ${lead.name} (${lead.phone || "?"}) — ${d.reason}`);
        state.logged.add(lead.id);
      }
    }
    // "wait" og "ignore" er tavse (undgår spam i loggen)
  }
}

function startLeadWatcher(cfg) {
  const state = { startMs: Date.now(), processed: loadProcessed(), logged: new Set() };
  const m = cfg.monday;
  console.log(`\n👀 Lead-vagt kører for board ${m.boardId}`);
  console.log(`   Tilstand: ${m.dryRun ? "🧪 TØR-TEST (sender intet, logger kun)" : "🔴 LIVE (sender rigtige beskeder)"}`);
  console.log(`   Whitelist: ${m.allowedNumbers && m.allowedNumbers.length ? m.allowedNumbers.join(", ") : "ALLE numre (ingen begrænsning!)"}`);
  console.log(`   Forsinkelse: ${m.delayMinutes || 4} min · tjekker hvert ${m.pollSeconds || 30}s`);
  console.log(`   Reagerer KUN på leads oprettet efter nu (aldrig de gamle).\n`);
  const run = () => tick(cfg, state).catch(e => console.error("[Lead-vagt] fejl:", e.message));
  run();
  return setInterval(run, (m.pollSeconds || 30) * 1000);
}

module.exports = { startLeadWatcher, decide, normalizeDkPhone, firstName, buildMessage, tick };
