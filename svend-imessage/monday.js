/* Monday.com API — henter nye leads (kun indgående kald, ingen offentlig URL nødvendig).
   Bruger den indbyggede fetch (Node 18+). Kræver en API-nøgle i config.monday.apiToken. */

async function mondayQuery(cfg, query, variables) {
  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "Authorization": cfg.monday.apiToken,
      "Content-Type": "application/json",
      "API-Version": "2024-01",
    },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json();
  if (data.errors) throw new Error("Monday API: " + JSON.stringify(data.errors).slice(0, 300));
  return data.data;
}

/* Find id'er på leads oprettet siden fromISO (via boardets aktivitetslog — pålideligt). */
async function getNewLeadIds(cfg, fromISO) {
  const q = `query($b:[ID!], $from:ISO8601DateTime){
    boards(ids:$b){ activity_logs(from:$from){ event data } }
  }`;
  const d = await mondayQuery(cfg, q, { b: String(cfg.monday.boardId), from: fromISO });
  const logs = (d.boards && d.boards[0] && d.boards[0].activity_logs) || [];
  const ids = [];
  for (const log of logs) {
    if (log.event === "create_pulse") {
      try {
        const data = JSON.parse(log.data);
        if (data.pulse_id) ids.push(String(data.pulse_id));
      } catch { /* ignorér ugyldig log */ }
    }
  }
  return [...new Set(ids)];
}

/* Hent navn + telefon for bestemte leads. */
async function getLeadDetails(cfg, ids) {
  if (!ids.length) return [];
  const q = `query($ids:[ID!], $col:[String!]){
    items(ids:$ids){ id name created_at column_values(ids:$col){ text } }
  }`;
  const d = await mondayQuery(cfg, q, { ids, col: [cfg.monday.phoneColumnId] });
  return (d.items || []).map(it => ({
    id: it.id,
    name: it.name,
    createdAt: it.created_at,
    phone: (it.column_values && it.column_values[0] && it.column_values[0].text) || "",
  }));
}

module.exports = { mondayQuery, getNewLeadIds, getLeadDetails };
