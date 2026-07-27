/* =============================================================================
   Opret "Claude note"-kolonne og flyt det Claude har skrevet i "Personlig note"
   derover (og ryd Personlig note). Rører KUN de leads Claude selv skrev til.
   Kør:  node move-notes.js
   ========================================================================== */
const cfg = require("./config.json");
const { mondayQuery } = require("./monday");
const { normalizeDkPhone } = require("./lead-watcher");

const BOARD = String(cfg.monday.boardId);
const NOTE_COL = "text_mm14fys7";     // Personlig note (kundens/dit felt — skal ryddes)
const PHONE_COL = "text_mkzb16sg";

// De leads hvor Claude selv skrev en note i Personlig note (svarene fra i dag)
const WROTE = new Set([
  "+4523480158", "+4542406029", "+4522321099", "+4540764456", "+4522639033",
  "+4520495451", "+4531776077", "+4552403810", "+4526821069",
]);

async function ensureColumn(title) {
  const q = `query($b:[ID!]){ boards(ids:$b){ columns{ id title } } }`;
  const d = await mondayQuery(cfg, q, { b: BOARD });
  const cols = (d.boards && d.boards[0] && d.boards[0].columns) || [];
  const ex = cols.find(c => c.title === title);
  if (ex) { console.log(`Kolonne "${title}" findes (${ex.id})`); return ex.id; }
  const m = `mutation($b:ID!){ create_column(board_id:$b, title:"${title}", column_type:text){ id } }`;
  const r = await mondayQuery(cfg, m, { b: BOARD });
  console.log(`Kolonne "${title}" oprettet (${r.create_column.id})`);
  return r.create_column.id;
}

(async () => {
  const claudeNoteCol = await ensureColumn("Claude note");
  const q = `query($b:[ID!]){ boards(ids:$b){ groups(ids:["topics"]){ items_page(limit:500){ items {
    id name column_values(ids:["${NOTE_COL}","${PHONE_COL}"]){ id text }
  } } } } }`;
  const d = await mondayQuery(cfg, q, { b: BOARD });
  const items = (d.boards && d.boards[0] && d.boards[0].groups[0] && d.boards[0].groups[0].items_page.items) || [];
  let ok = 0;
  for (const it of items) {
    const cv = {};
    (it.column_values || []).forEach(c => { cv[c.id] = c.text; });
    if (!WROTE.has(normalizeDkPhone(cv[PHONE_COL] || ""))) continue;
    const note = cv[NOTE_COL] || "";
    if (!note) continue;
    const v = JSON.stringify({ [claudeNoteCol]: note, [NOTE_COL]: "" });   // flyt + ryd
    const m = `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b, item_id:$i, column_values:$v){ id } }`;
    try { await mondayQuery(cfg, m, { b: BOARD, i: String(it.id), v }); ok++; console.log(`  ✅ ${it.name}: flyttet "${note}"`); }
    catch (e) { console.log("  ❌ " + it.name + ": " + e.message); }
  }
  console.log(`\n${ok} noter flyttet til "Claude note", Personlig note ryddet.`);
  console.log("CLAUDE_NOTE_COL = " + claudeNoteCol);
})().catch(e => { console.error("FEJL:", e.message); process.exit(1); });
