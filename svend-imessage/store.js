/* Simpelt lager: gemmer samtale-tilstand pr. kunde + alle leads i data/*.json.
   Ingen database nødvendig — bare JSON-filer. */
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "data");
const CONTACTS = path.join(DIR, "contacts.json");
const LEADS = path.join(DIR, "leads.json");

function load(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { return fallback; }
}
function save(file, obj) {
  try {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(obj, null, 2));
  } catch (e) { console.error("[Svend] Kunne ikke gemme", file, e.message); }
}

let contacts = load(CONTACTS, {});
let leads = load(LEADS, []);

function getState(contact) {
  if (!contacts[contact]) contacts[contact] = { contact, step: "new", greeted: false };
  return contacts[contact];
}
function saveState() { save(CONTACTS, contacts); }

function addLead(lead) {
  leads.push({ ...lead, tidspunkt: new Date().toISOString() });
  save(LEADS, leads);
}

module.exports = { getState, saveState, addLead };
