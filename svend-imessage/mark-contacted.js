/* =============================================================================
   MARKÉR KONTAKTEDE — opretter status-kolonnen "Claude push sendt" (🤖 Sendt)
   og sætter den + opfølgningsdato (i morgen) på de ubehandlede Koordiner-leads
   som Claude har skrevet til. Springer +4530803017 over.
   Kør:  node mark-contacted.js
   ========================================================================== */
const cfg = require("./config.json");
const { mondayQuery } = require("./monday");
const { normalizeDkPhone } = require("./lead-watcher");

const BOARD = String(cfg.monday.boardId);
const COL_TITLE = "Claude push sendt";
const LABEL = "🤖 Sendt";
const SKIP = ["+4530803017"];

function tomorrowStr() {
  const d = new Date(Date.now() + 86400000);
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

async function ensureColumn() {
  const q = `query($b:[ID!]){ boards(ids:$b){ columns{ id title } } }`;
  const d = await mondayQuery(cfg, q, { b: BOARD });
  const cols = (d.boards && d.boards[0] && d.boards[0].columns) || [];
  const existing = cols.find(c => c.title === COL_TITLE);
  if (existing) { console.log(`Kolonne "${COL_TITLE}" findes (${existing.id})`); return existing.id; }
  const m = `mutation($b:ID!){ create_column(board_id:$b, title:"${COL_TITLE}", column_type:status){ id } }`;
  const r = await mondayQuery(cfg, m, { b: BOARD });
  console.log(`Kolonne "${COL_TITLE}" oprettet (${r.create_column.id})`);
  return r.create_column.id;
}

async function getUnprocessed() {
  const q = `query($b:[ID!]){ boards(ids:$b){ groups(ids:["topics"]){ items_page(limit:500){ items {
    id name column_values(ids:["date_mkzby5hg","text_mkzb16sg"]){ id text }
  } } } } }`;
  const d = await mondayQuery(cfg, q, { b: BOARD });
  const items = (d.boards && d.boards[0] && d.boards[0].groups[0] && d.boards[0].groups[0].items_page.items) || [];
  const out = [];
  for (const it of items) {
    const cv = {};
    (it.column_values || []).forEach(c => { cv[c.id] = c.text; });
    if (cv["date_mkzby5hg"]) continue;                       // har allerede dato
    if (SKIP.includes(normalizeDkPhone(cv["text_mkzb16sg"] || ""))) continue;
    out.push({ id: it.id, name: it.name });
  }
  return out;
}

(async () => {
  const colId = await ensureColumn();
  const tomorrow = tomorrowStr();
  const leads = await getUnprocessed();
  console.log(`\nMarkerer ${leads.length} leads: opfølgningsdato=${tomorrow}, status="${LABEL}"\n`);
  let ok = 0;
  for (const l of leads) {
    const v = JSON.stringify({ date_mkzby5hg: { date: tomorrow }, [colId]: { label: LABEL } });
    const m = `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b, item_id:$i, column_values:$v, create_labels_if_missing:true){ id } }`;
    try { await mondayQuery(cfg, m, { b: BOARD, i: String(l.id), v }); ok++; console.log("  ✅ " + l.name); }
    catch (e) { console.log("  ❌ " + l.name + ": " + e.message); }
  }
  console.log(`\n${ok}/${leads.length} markeret som "🤖 Sendt" + opfølgning i morgen.`);
})().catch(e => { console.error("FEJL:", e.message); process.exit(1); });
