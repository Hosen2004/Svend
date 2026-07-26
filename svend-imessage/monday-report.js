/* =============================================================================
   MONDAY-RAPPORT — tæller nye leads + leads flyttet ud af "Koordiner"
   og hvortil. Bruger Monday-nøglen fra config.json.
   ========================================================================== */
const { mondayQuery } = require("./monday");

const KOORDINER = "topics"; // gruppe-id for "Koordiner" på boardet

async function buildMondayReport(cfg, sinceISO) {
  const q = `query($b:[ID!], $from:ISO8601DateTime){
    boards(ids:$b){ activity_logs(from:$from, limit:500){ event data } }
  }`;
  const d = await mondayQuery(cfg, q, { b: String(cfg.monday.boardId), from: sinceISO });
  const logs = (d.boards && d.boards[0] && d.boards[0].activity_logs) || [];

  let newLeads = 0;
  const newLeadNames = [];
  let movedOut = 0;
  const movedTo = {}; // destinationsgruppe -> antal

  for (const log of logs) {
    let data;
    try { data = JSON.parse(log.data); } catch { continue; }

    if (log.event === "create_pulse" && data.group_id === KOORDINER) {
      newLeads++;
      if (data.pulse_name) newLeadNames.push(data.pulse_name);
    } else if (log.event === "move_pulse_from_group") {
      const srcId = (data.source_group && data.source_group.id) || data.group_id;
      if (srcId === KOORDINER) {
        movedOut++;
        const dest = (data.dest_group && data.dest_group.title) || "Ukendt gruppe";
        movedTo[dest] = (movedTo[dest] || 0) + 1;
      }
    }
  }
  return { newLeads, newLeadNames, movedOut, movedTo };
}

/* Formatér Monday-delen til rapport-tekst */
function formatMondayReport(r) {
  const lines = [];
  lines.push(`📊 LEADS (Monday)`);
  lines.push(`• Nye leads: ${r.newLeads}`);
  if (r.movedOut === 0) {
    lines.push(`• Rykket ud af Koordiner: 0`);
  } else {
    lines.push(`• Rykket ud af Koordiner: ${r.movedOut}`);
    const parts = Object.entries(r.movedTo)
      .sort((a, b) => b[1] - a[1])
      .map(([dest, n]) => `   → ${dest}: ${n}`);
    lines.push(...parts);
  }
  return lines.join("\n");
}

module.exports = { buildMondayReport, formatMondayReport };
