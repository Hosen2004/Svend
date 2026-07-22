/* =============================================================================
   TERMINAL-TEST — skriv med Svend uden iMessage.
   Kør:  node simulate.js
   Bruger config.json hvis den findes, ellers standard (VVS, gratis hjerne).
   Skriv beskeder som en kunde. Skriv "slut" for at stoppe.
   ========================================================================== */
const readline = require("readline");
const { TRADES } = require("./trades");
const { handleMessage } = require("./brain");

let cfg;
try { cfg = require("./config.json"); }
catch {
  cfg = { firm: "Nordjysk VVS", tradeKey: "vvs", ownerPhone: "+45 20 00 00 00", useClaude: false };
}
const trade = TRADES[cfg.tradeKey] || TRADES.vvs;
const state = { contact: "+45 12 34 56 78 (test-kunde)", step: "new", greeted: false, history: [] };

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
console.log(`\n🔧 Svend-simulator — ${cfg.firm} (${trade.name})`);
console.log(`   Hjerne: ${cfg.useClaude && cfg.anthropicApiKey ? "Claude" : "regelbaseret (gratis)"}`);
console.log(`   Skriv som kunden. "slut" for at stoppe.\n`);

function ask() {
  rl.question("Kunde:  ", async (text) => {
    if (text.trim().toLowerCase() === "slut") { rl.close(); return; }
    const out = await handleMessage(state, text, cfg, trade);
    for (const r of out.replies) console.log("Svend:  " + r.replace(/\n/g, "\n        "));
    if (out.ownerNotify) console.log("\n  🔔 [Mester får SMS]:\n        " + out.ownerNotify.replace(/\n/g, "\n        ") + "\n");
    ask();
  });
}
ask();
