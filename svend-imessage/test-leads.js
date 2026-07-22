/* Tester lead-vagtens logik (rene funktioner, ingen netværk). Kør: node test-leads.js */
const assert = require("assert");
const { decide, normalizeDkPhone, firstName, buildMessage } = require("./lead-watcher");

let passed = 0;
const ok = n => { console.log("  ✅ " + n); passed++; };

const TMPL = "Hey {{navn}}, jeg så lige at du har skrevet dig op til et tilbud på vinduerne derhjemme. Jeg er lige ude og pudse vinduer i en halv time mere — må jeg ringe til dig der? Bedste hilsner Noah, vinduespudser";

console.log("\n🧪 Tester lead-vagten…\n");

// Telefon-formatering
assert.strictEqual(normalizeDkPhone("30803017"), "+4530803017");
assert.strictEqual(normalizeDkPhone("+4530224192"), "+4530224192");
assert.strictEqual(normalizeDkPhone("22 65 90 55"), "+4522659055");
assert.strictEqual(normalizeDkPhone("4530803017"), "+4530803017");
assert.strictEqual(normalizeDkPhone(""), "");
ok("Telefonnumre normaliseres korrekt (8-cifret, +45, mellemrum)");

// Fornavn + besked
assert.strictEqual(firstName("Amalie Prien Aloush"), "Amalie");
assert.strictEqual(firstName("julie bavngaard aabo"), "Julie");
assert(buildMessage(TMPL, "Amalie Prien Aloush").startsWith("Hey Amalie,"));
ok("Fornavn trækkes ud og sættes ind i beskeden");

const START = Date.parse("2026-07-22T23:00:00Z");
const DELAY = 4 * 60000;
const base = { nowMs: START + 10 * 60000, startMs: START, delayMs: DELAY, processed: new Set(), allowed: ["+4530803017"] };

// Backlog ignoreres
assert.strictEqual(decide({ id: "1", name: "Gammel", createdAt: "2026-07-20T10:00:00Z", phone: "30803017" }, base).action, "ignore");
ok("Gamle leads (backlog) ignoreres — rører aldrig eksisterende kunder");

// Venter på 4 min
{
  const now = START + 2 * 60000; // kun 2 min efter oprettelse
  const d = decide({ id: "2", name: "Ny", createdAt: new Date(START + 60000).toISOString(), phone: "30803017" }, { ...base, nowMs: now });
  assert.strictEqual(d.action, "wait");
}
ok("Nyt lead under 4 min gammelt → venter");

// Klar + på whitelist → send
{
  const d = decide({ id: "3", name: "Test Hanne", createdAt: new Date(START + 60000).toISOString(), phone: "30803017" }, { ...base, nowMs: START + 6 * 60000 });
  assert.strictEqual(d.action, "send");
  assert.strictEqual(d.phone, "+4530803017");
}
ok("Nyt lead ≥4 min + på whitelist → SEND");

// Ikke på whitelist → blokeret (beskytter rigtige kunder)
{
  const d = decide({ id: "4", name: "Fremmed Kunde", createdAt: new Date(START + 60000).toISOString(), phone: "12345678" }, { ...base, nowMs: START + 6 * 60000 });
  assert.strictEqual(d.action, "blocked");
}
ok("Nummer uden for whitelist → BLOKERET (sender ikke uden din tilladelse)");

// Tom whitelist = alle tilladt
{
  const d = decide({ id: "5", name: "Nogen", createdAt: new Date(START + 60000).toISOString(), phone: "12345678" }, { ...base, nowMs: START + 6 * 60000, allowed: [] });
  assert.strictEqual(d.action, "send");
}
ok("Tom whitelist [] → alle numre tilladt (når du åbner op)");

// Manglende telefon → skip
assert.strictEqual(decide({ id: "6", name: "Uden nr", createdAt: new Date(START + 60000).toISOString(), phone: "" }, { ...base, nowMs: START + 6 * 60000 }).action, "skip");
ok("Lead uden telefonnummer → springes pænt over");

// Allerede kontaktet → ignoreres (ingen dobbelt-besked)
{
  const proc = new Set(["7"]);
  const d = decide({ id: "7", name: "Igen", createdAt: new Date(START + 60000).toISOString(), phone: "30803017" }, { ...base, nowMs: START + 6 * 60000, processed: proc });
  assert.strictEqual(d.action, "ignore");
}
ok("Allerede kontaktet → aldrig dobbelt-besked");

console.log(`\n🎉 ${passed}/${passed} test bestået — 0 fejl.\n`);
