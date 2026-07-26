/* =============================================================================
   Opret kolonnen "Claude push besvaret" (status) og sæt alle leads der har
   "Claude push sendt = 🤖 Sendt" til udgangsværdien "⏳ Afventer svar".
   Kør:  node mark-besvaret.js
   ========================================================================== */
const cfg = require("./config.json");
const { mondayQuery } = require("./monday");

const BOARD = String(cfg.monday.boardId);
const SENDT_COL = "color_mm5mz79n";   // "Claude push sendt"
const NEW_TITLE = "Claude push besvaret";
const BASELINE = "⏳ Afventer svar";

async function ensureColumn(title) {
  const q = `query($b:[ID!]){ boards(ids:$b){ columns{ id title } } }`;
  const d = await mondayQuery(cfg, q, { b: BOARD });
  const cols = (d.boards && d.boards[0] && d.boards[0].columns) || [];
  const ex = cols.find(c => c.title === title);
  if (ex) { console.log(`Kolonne "${title}" findes (${ex.id})`); return ex.id; }
  const m = `mutation($b:ID!){ create_column(board_id:$b, title:"${title}", column_type:status){ id } }`;
  const r = await mondayQuery(cfg, m, { b: BOARD });
  console.log(`Kolonne "${title}" oprettet (${r.create_column.id})`);
  return r.create_column.id;
}

async function getSentItems() {
  const q = `query($b:[ID!]){ boards(ids:$b){ groups(ids:["topics"]){ items_page(limit:500){ items {
    id name column_values(ids:["${SENDT_COL}"]){ id text }
  } } } } }`;
  const d = await mondayQuery(cfg, q, { b: BOARD });
  const items = (d.boards && d.boards[0] && d.boards[0].groups[0] && d.boards[0].groups[0].items_page.items) || [];
  return items.filter(it => {
    const cv = {};
    (it.column_values || []).forEach(c => { cv[c.id] = c.text; });
    return cv[SENDT_COL] === "🤖 Sendt";
  });
}

(async () => {
  const colId = await ensureColumn(NEW_TITLE);
  const items = await getSentItems();
  console.log(`\nSætter ${items.length} leads til "${BASELINE}"\n`);
  let ok = 0;
  for (const it of items) {
    const v = JSON.stringify({ [colId]: { label: BASELINE } });
    const m = `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b, item_id:$i, column_values:$v, create_labels_if_missing:true){ id } }`;
    try { await mondayQuery(cfg, m, { b: BOARD, i: String(it.id), v }); ok++; console.log("  ✅ " + it.name); }
    catch (e) { console.log("  ❌ " + it.name + ": " + e.message); }
  }
  console.log(`\n${ok}/${items.length} sat til "${BASELINE}".`);
  console.log("KOLONNE_ID for 'Claude push besvaret' = " + colId);
})().catch(e => { console.error("FEJL:", e.message); process.exit(1); });
