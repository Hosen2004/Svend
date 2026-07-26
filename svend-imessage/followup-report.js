/* =============================================================================
   OPFØLGNINGS-RAPPORT — hvem skal følges op i dag (Followup-datoen er nået)
   i grupperne: Koordiner, Tilbud sendt venter svar, Tilbud med dato.
   Followup-kolonne = date_mkzby5hg.
   ========================================================================== */
const { mondayQuery } = require("./monday");

const GROUPS = {
  topics: "Koordiner",
  group_mkzb5k8x: "Tilbud sendt venter svar",
  group_title: "Tilbud med dato",
};
const FOLLOWUP_COL = "date_mkzby5hg";
const PHONE_COL = "text_mkzb16sg";

function todayLocal() {
  const d = new Date();
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

async function buildFollowupReport(cfg, todayStr) {
  const today = todayStr || todayLocal();
  const q = `query($b:[ID!], $g:[String!]){
    boards(ids:$b){ groups(ids:$g){ id title items_page(limit:500){ items {
      name column_values(ids:["${FOLLOWUP_COL}","${PHONE_COL}"]){ id text }
    } } } }
  }`;
  const d = await mondayQuery(cfg, q, { b: String(cfg.monday.boardId), g: Object.keys(GROUPS) });
  const groups = (d.boards && d.boards[0] && d.boards[0].groups) || [];

  const due = [];
  for (const g of groups) {
    const items = (g.items_page && g.items_page.items) || [];
    for (const it of items) {
      const cv = {};
      (it.column_values || []).forEach(c => { cv[c.id] = c.text; });
      const fdate = cv[FOLLOWUP_COL];
      if (!fdate) continue;                 // ingen opfølgningsdato sat
      if (fdate <= today) {                 // forfalden eller i dag (YYYY-MM-DD kan sammenlignes som tekst)
        due.push({
          name: it.name,
          phone: cv[PHONE_COL] || "",
          group: g.title,
          date: fdate,
          overdue: fdate < today,
        });
      }
    }
  }
  due.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return { due, today };
}

function formatFollowupReport(r) {
  const idag = r.due.filter(d => !d.overdue).length;
  const forfaldne = r.due.filter(d => d.overdue).length;
  return [
    "🔔 OPFØLGNINGER",
    `• I dag: ${idag}`,
    `• Forfaldne: ${forfaldne}`,
    `• I alt: ${r.due.length}`,
  ].join("\n");
}

module.exports = { buildFollowupReport, formatFollowupReport, todayLocal };
