/* =============================================================================
   AUTOMATISK TEST — beviser at hjernen svarer rigtigt (regelbaseret).
   Kør:  node test.js    (0 fejl = alt virker)
   ========================================================================== */
const assert = require("assert");
const { TRADES } = require("./trades");
const { handleMessage } = require("./brain");

const cfg = { firm: "Nordjysk VVS", tradeKey: "vvs", ownerPhone: "+4520000000", useClaude: false };
const trade = TRADES.vvs;

let passed = 0;
function ok(name) { console.log("  ✅ " + name); passed++; }

async function run() {
  console.log("\n🧪 Tester Svends hjerne (regelbaseret)…\n");

  // 1) Hilsen giver velkomst
  {
    const s = { contact: "kunde1", step: "new", greeted: false };
    const r = await handleMessage(s, "hej", cfg, trade);
    assert(r.replies[0].includes("velkommen"), "skal byde velkommen");
    ok("Hilsen → velkomst");
  }

  // 2) Prisspørgsmål på konkret vare giver korrekt pris
  {
    const s = { contact: "kunde2", step: "new", greeted: false };
    const r = await handleMessage(s, "hvad koster et nyt toilet?", cfg, trade);
    const joined = r.replies.join(" ");
    assert(joined.includes("1.900 kr"), "toilet skal koste 1.900 kr");
    assert(s.step === "quoted", "skal være i 'quoted' tilstand");
    ok("Pris på toilet → 1.900 kr + tilbyder booking");
  }

  // 3) Booking-flow: ja → adresse → tid → booket + mester-notifikation
  {
    const s = { contact: "+4599112233", step: "new", greeted: false };
    await handleMessage(s, "hvad koster en ny vandhane", cfg, trade);       // quoted
    let r = await handleMessage(s, "ja tak", cfg, trade);                    // -> awaitAddress
    assert(s.step === "awaitAddress", "skal bede om adresse");
    r = await handleMessage(s, "Solvej 12, 9000 Aalborg", cfg, trade);      // -> awaitTime
    assert(s.step === "awaitTime", "skal bede om tid");
    assert(r.replies[0].includes("14:00"), "skal tilbyde tider");
    r = await handleMessage(s, "i dag kl 14", cfg, trade);                  // -> booked
    assert(s.step === "booked", "skal være booket");
    assert(r.ownerNotify && r.ownerNotify.includes("NY OPGAVE"), "mester skal notificeres");
    assert(r.ownerNotify.includes("Solvej 12"), "notifikation skal indeholde adresse");
    assert(r.lead && r.lead.adresse.includes("Solvej"), "lead skal have adresse");
    ok("Booking-flow → booket + mester får besked med adresse & tid");
  }

  // 4) Akut håndteres med det samme + akut-notifikation
  {
    const s = { contact: "+4544556677", step: "new", greeted: false };
    const r = await handleMessage(s, "hjælp, mit vandrør er sprunget og det fosser!", cfg, trade);
    assert(r.replies.join(" ").toLowerCase().includes("akut"), "skal reagere på akut");
    assert(s.step === "awaitAddress", "akut skal bede om adresse");
    assert(r.ownerNotify && r.ownerNotify.includes("AKUT"), "mester skal få akut-besked");
    ok("Akut → beroliger, beder om adresse, alarmerer mester");
  }

  // 5) Ukendt vare uden pris → spørger hvad opgaven er
  {
    const s = { contact: "kunde5", step: "new", greeted: false };
    const r = await handleMessage(s, "hvad koster det?", cfg, trade);
    assert(s.step === "awaitJob", "skal spørge hvad opgaven er");
    assert(r.replies.join(" ").includes("toilet"), "skal vise eksempler med priser");
    ok("Generelt prisspørgsmål → viser eksempel-priser");
  }

  // 6) Andet fag (vinduespudser) med minimumspris
  {
    const t2 = TRADES.vinduespudser;
    const c2 = { firm: "Klart Udsyn", tradeKey: "vinduespudser", ownerPhone: "x", useClaude: false };
    const s = { contact: "kunde6", step: "new", greeted: false };
    const r = await handleMessage(s, "hvad koster det at få pudset et standard vindue", c2, t2);
    assert(r.replies.join(" ").includes("35 kr"), "standardvindue = 35 kr/stk");
    ok("Vinduespudser → korrekt meter/stk-pris fra eget fag");
  }

  // 7) Aldrig tomt svar (kunden taber aldrig tråden)
  {
    const s = { contact: "kunde7", step: "new", greeted: true };
    const r = await handleMessage(s, "asdfghjkl", cfg, trade);
    assert(r.replies.length > 0 && r.replies[0].length > 0, "skal altid svare noget");
    ok("Volapyk → svarer stadig pænt (aldrig tomt)");
  }

  console.log(`\n🎉 ${passed}/7 test bestået — 0 fejl.\n`);
}

run().catch(e => { console.error("\n❌ TEST FEJLEDE:", e.message, "\n"); process.exit(1); });
