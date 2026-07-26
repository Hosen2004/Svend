/* Opdaterer "Claude push besvaret" + Personlig note for leads der har svaret. */
const cfg = require("./config.json");
const { mondayQuery } = require("./monday");
const { normalizeDkPhone } = require("./lead-watcher");

const BOARD = String(cfg.monday.boardId);
const BESV_COL = "color_mm5mrs8k";   // Claude push besvaret
const NOTE_COL = "text_mm14fys7";    // Personlig note
const PHONE_COL = "text_mkzb16sg";

// telefon (normaliseret) -> svar
const REPLIES = {
  "+4523480158": { label: "✅ Svaret", note: "Svar: ja, ring i morgen (Cecilie)" },
  "+4542406029": { label: "✅ Svaret", note: "Svar: ja, ring i morgen (Ida)" },
  "+4522321099": { label: "✅ Svaret", note: "Svar: ja — tilbud, fraflyttet lejlighed (Heidi)" },
  "+4540764456": { label: "✅ Svaret", note: "Svar: ja, ring i morgen (Ditte)" },
  "+4522639033": { label: "✅ Svaret", note: "Svar: på job, prøv alligevel (Birgit)" },
  "+4520495451": { label: "✅ Svaret", note: "Svar: velkommen til at ringe (Margaret)" },
  "+4531776077": { label: "✅ Svaret", note: "Svar: ja (Christel)" },
  "+4552403810": { label: "✅ Svaret", note: "Svar: ja, velkommen (Thomas)" },
  "+4526821069": { label: "📞 Tid foreslået", note: "Svar: ikke vågen kl 08 — ring senere (Ingeborg)" },
};

(async () => {
  const q = `query($b:[ID!]){ boards(ids:$b){ groups(ids:["topics"]){ items_page(limit:500){ items {
    id name column_values(ids:["${PHONE_COL}"]){ id text }
  } } } } }`;
  const d = await mondayQuery(cfg, q, { b: BOARD });
  const items = (d.boards && d.boards[0] && d.boards[0].groups[0] && d.boards[0].groups[0].items_page.items) || [];
  let ok = 0;
  for (const it of items) {
    const cv = {};
    (it.column_values || []).forEach(c => { cv[c.id] = c.text; });
    const r = REPLIES[normalizeDkPhone(cv[PHONE_COL] || "")];
    if (!r) continue;
    const v = JSON.stringify({ [BESV_COL]: { label: r.label }, [NOTE_COL]: r.note });
    const m = `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b, item_id:$i, column_values:$v, create_labels_if_missing:true){ id } }`;
    try { await mondayQuery(cfg, m, { b: BOARD, i: String(it.id), v }); ok++; console.log(`  ✅ ${it.name} → ${r.label}`); }
    catch (e) { console.log("  ❌ " + it.name + ": " + e.message); }
  }
  console.log(`\n${ok} leads opdateret som besvaret.`);
})().catch(e => { console.error("FEJL:", e.message); process.exit(1); });
