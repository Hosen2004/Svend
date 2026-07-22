/* =============================================================================
   LEAD-VAGT — start her.  Kør:  node leads.js
   Tjekker Monday for nye leads og sender Noah-beskeden 4 min efter.
   (Kræver ikke BlueBubbles — kun en Monday API-nøgle + at Messages er logget ind.)
   ========================================================================== */
let cfg;
try { cfg = require("./config.json"); }
catch { console.error("\n⚠️  Mangler config.json. Kopiér config.example.json til config.json og udfyld den.\n"); process.exit(1); }

if (!cfg.monday || !cfg.monday.apiToken) {
  console.error("\n⚠️  Mangler 'monday.apiToken' i config.json.\n   Hent en nøgle: monday.com → din profil → Udvikler → My Access Tokens.\n");
  process.exit(1);
}
if (!cfg.followupMessage) {
  console.error("\n⚠️  Mangler 'followupMessage' i config.json.\n");
  process.exit(1);
}

const { startLeadWatcher } = require("./lead-watcher");
startLeadWatcher(cfg);
