/* =============================================================================
   TILFØJ KONTAKTER — lægger ubehandlede Koordiner-leads ind i macOS Kontakter
   (gruppe "Puds og Plus leads"), så navnet vises ved opkald. Springer 30803017 over.
   Kør:  node add-contacts.js --dry   (vis listen)
         node add-contacts.js         (opret kontakterne)
   ========================================================================== */
const { execFile } = require("child_process");
const cfg = require("./config.json");
const { mondayQuery } = require("./monday");
const { normalizeDkPhone } = require("./lead-watcher");

const DRY = process.argv.includes("--dry");
const GROUP = "Puds og Plus leads";
const SKIP = ["+4530803017"]; // eget/Noah-nummer

const AS = `on run argv
  set fname to item 1 of argv
  set lname to item 2 of argv
  set phoneVal to item 3 of argv
  set noteVal to item 4 of argv
  tell application "Contacts"
    launch
    if not (exists group "${GROUP}") then
      make new group with properties {name:"${GROUP}"}
      save
    end if
    set p to make new person with properties {first name:fname, last name:lname, note:noteVal}
    make new phone at end of phones of p with properties {label:"mobile", value:phoneVal}
    add p to group "${GROUP}"
    save
  end tell
end run`;

function addContact(first, last, phone, note) {
  return new Promise((resolve, reject) => {
    execFile("osascript", ["-e", AS, first, last, phone, note], (err, so, se) => {
      if (err) return reject(new Error(se || err.message));
      resolve(true);
    });
  });
}

async function getUnprocessed() {
  const q = `query($b:[ID!]){ boards(ids:$b){ groups(ids:["topics"]){ items_page(limit:500){ items {
    name column_values(ids:["date_mkzby5hg","text_mkzb16sg","text_mkzbat9m","text_mkzbmrqv"]){ id text }
  } } } } }`;
  const d = await mondayQuery(cfg, q, { b: String(cfg.monday.boardId) });
  const items = (d.boards && d.boards[0] && d.boards[0].groups[0] && d.boards[0].groups[0].items_page.items) || [];
  const out = [];
  const seen = new Set();
  for (const it of items) {
    const cv = {};
    (it.column_values || []).forEach(c => { cv[c.id] = c.text; });
    if (cv["date_mkzby5hg"]) continue;                 // har opfølgningsdato = ikke ubehandlet
    const phone = normalizeDkPhone(cv["text_mkzb16sg"] || "");
    if (!phone) continue;                              // intet nummer
    if (SKIP.includes(phone)) continue;                // spring eget nummer over
    if (seen.has(phone)) continue;                     // undgå dubletter
    seen.add(phone);
    const parts = String(it.name || "").trim().split(/\s+/);
    const first = parts[0] || it.name || "Lead";
    const last = parts.slice(1).join(" ");
    const addr = (cv["text_mkzbat9m"] || "").trim();
    const job = (cv["text_mkzbmrqv"] || "").replace(/\s+/g, " ").trim().slice(0, 120);
    const note = ["Puds og Plus lead", addr, job].filter(Boolean).join(" · ");
    out.push({ first, last, phone, note, display: it.name });
  }
  return out;
}

(async () => {
  const leads = await getUnprocessed();
  console.log(`\n${leads.length} ubehandlede leads (30803017 sprunget over):\n`);
  leads.forEach(l => console.log(`• ${l.display}  ${l.phone}`));
  if (DRY) { console.log("\n--dry: intet oprettet."); return; }
  // sørg for at Kontakter-appen kører (ellers -600)
  await new Promise(res => execFile("open", ["-a", "Contacts"], () => res()));
  await new Promise(r => setTimeout(r, 2500));
  console.log("\nOpretter kontakter…");
  let ok = 0;
  for (const l of leads) {
    try { await addContact(l.first, l.last, l.phone, l.note); ok++; console.log("  ✅ " + l.display); }
    catch (e) { console.log("  ❌ " + l.display + ": " + e.message); }
  }
  console.log(`\n${ok}/${leads.length} kontakter oprettet i gruppen "${GROUP}".`);
})().catch(e => { console.error("FEJL:", e.message); process.exit(1); });
