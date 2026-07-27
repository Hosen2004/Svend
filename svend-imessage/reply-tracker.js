/* =============================================================================
   SVAR-TRACKER — når et pushet lead (Claude push sendt = 🤖 Sendt) svarer,
   opdateres "Claude push besvaret" i Monday automatisk (+ note med tidspunkt).
   Kaldes fra server.js for hver indgående besked.
   ========================================================================== */
const { mondayQuery } = require("./monday");
const { normalizeDkPhone } = require("./lead-watcher");

const SENDT_COL = "color_mm5mz79n";      // Claude push sendt
const BESV_COL = "color_mm5mrs8k";       // Claude push besvaret
const ONSKET_TID_COL = "text_mm5msfk7";  // Ønsket tid
const PHONE_COL = "text_mkzb16sg";

let _cache = new Map();   // normaliseret telefon -> { id, besvaret }
let _cacheAt = 0;
const CACHE_MS = 5 * 60 * 1000;

async function refreshCache(cfg) {
  const q = `query($b:[ID!]){ boards(ids:$b){ groups(ids:["topics"]){ items_page(limit:500){ items {
    id column_values(ids:["${PHONE_COL}","${SENDT_COL}","${BESV_COL}"]){ id text }
  } } } } }`;
  const d = await mondayQuery(cfg, q, { b: String(cfg.monday.boardId) });
  const items = (d.boards && d.boards[0] && d.boards[0].groups[0] && d.boards[0].groups[0].items_page.items) || [];
  const map = new Map();
  for (const it of items) {
    const cv = {};
    (it.column_values || []).forEach(c => { cv[c.id] = c.text; });
    if (cv[SENDT_COL] !== "🤖 Sendt") continue;         // kun leads vi har pushet
    const phone = normalizeDkPhone(cv[PHONE_COL] || "");
    if (phone) map.set(phone, { id: it.id, besvaret: cv[BESV_COL] || "" });
  }
  _cache = map;
  _cacheAt = Date.now();
}

async function classify(cfg, text) {
  const system = `En kunde har fået denne SMS fra en vinduespudser: "kan jeg ringe i morgen mellem 08 og 16, er der et tidspunkt der passer bedst?". Her er kundens SVAR. Afgør:
- "answered": true hvis kunden siger ja/ok til at blive ringet op; false hvis de afviser (nej tak / ikke interesseret).
- "time": hvis kunden nævner et ønsket tidspunkt eller en begrænsning (fx "efter kl 15", "ikke før 10", "helst formiddag", "på arbejde til 16", "ikke vågen kl 08"), så skriv KUN selve tidspunktet kort på dansk. Ellers tom streng "".
Svar KUN med gyldig JSON (ingen markdown): {"answered":true,"time":""}`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": cfg.anthropicApiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: cfg.model || "claude-sonnet-5", max_tokens: 600, system, messages: [{ role: "user", content: text }] }),
  });
  if (!res.ok) throw new Error("Claude " + res.status);
  const data = await res.json();
  const raw = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
  let s = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  let parsed; try { parsed = JSON.parse(s); } catch { const m = s.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : null; }
  if (!parsed) return { label: "✅ Svaret", time: "" };
  return { label: parsed.answered === false ? "❌ Nej tak" : "✅ Svaret", time: (parsed.time || "").trim() };
}

/* Kaldes for hver indgående besked. Returnerer {label,note} hvis Monday blev opdateret, ellers null. */
async function handleLeadReply(cfg, phone, text) {
  const norm = normalizeDkPhone(phone);
  if (!norm) return null;
  if (Date.now() - _cacheAt > CACHE_MS) { try { await refreshCache(cfg); } catch (e) { /* prøv igen senere */ } }
  const lead = _cache.get(norm);
  if (!lead) return null;                                    // ikke et pushet lead
  if (lead.besvaret === "❌ Nej tak") return null;           // allerede afklaret (nej)

  const { label, time } = await classify(cfg, text);
  const cols = { [BESV_COL]: { label } };
  if (time) cols[ONSKET_TID_COL] = time;                     // skriv selve tidspunktet i "Ønsket tid"
  const v = JSON.stringify(cols);
  const m = `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b, item_id:$i, column_values:$v, create_labels_if_missing:true){ id } }`;
  await mondayQuery(cfg, m, { b: String(cfg.monday.boardId), i: String(lead.id), v });
  lead.besvaret = label;                                     // opdatér cache
  return { label, time };
}

module.exports = { handleLeadReply, refreshCache, classify };
