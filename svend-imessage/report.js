/* =============================================================================
   DAGLIG RAPPORT — samler mail + Monday-leads til én iMessage.
   Kør:  node report.js          (henter, opsummerer og SENDER)
         node report.js --dry    (viser rapporten uden at sende)
   Køres automatisk kl. 11 via launchd (se com.pudsogplus.rapport.plist).
   ========================================================================== */
const cfg = require("./config.json");
const { sendIMessage } = require("./imessage");
const { buildMondayReport, formatMondayReport } = require("./monday-report");
const { buildFollowupReport, formatFollowupReport } = require("./followup-report");
const { fetchRecentEmails } = require("./gmail");

const DRY = process.argv.includes("--dry");

/* Opsummér mails til det vigtige via Claude */
async function summarizeEmails(cfg, emails) {
  const empty = "📧 MAIL (seneste 24t)\n• Kræver handling: 0\n• Tidsfølsomt: 0\n• Nye henvendelser: 0";
  if (!emails.length) return empty;
  const list = emails
    .map((e, i) => `#${i + 1}\nFra: ${e.from}\nEmne: ${e.subject}\nTekst: ${e.text}`)
    .join("\n\n");
  const system = `Du er Puds og Plus' assistent (vinduespudser). Du får en liste af mails fra det seneste døgn. TÆL hvor mange der falder i hver kategori.
Ignorér støj HELT (tæl dem IKKE): kvitteringer, MFA/login-koder, login-notifikationer, reklamer, annonce-kvitteringer (Meta/Facebook/Anthropic), nyhedsbreve og andre automatiske beskeder.
Kategorier:
- Kræver handling: eksisterende kunder der vil rykke/ændre tid, opsige/ændre abonnement, klage, eller kræver svar.
- Tidsfølsomt: tilbud/henvendelser der haster.
- Nye henvendelser: nye kunde-forespørgsler.
Svar KUN med præcis disse tre linjer og et tal. INGEN navne, INGEN detaljer, ingen anden tekst:
Kræver handling: <antal>
Tidsfølsomt: <antal>
Nye henvendelser: <antal>`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": cfg.anthropicApiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: cfg.model || "claude-sonnet-5", max_tokens: 1500, system, messages: [{ role: "user", content: list }] }),
  });
  if (!res.ok) throw new Error("Claude " + res.status + ": " + (await res.text()).slice(0, 200));
  const data = await res.json();
  const raw = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
  if (!raw) return empty;
  const lines = raw.split("\n").map(s => s.trim()).filter(Boolean).map(s => (s.startsWith("•") ? s : "• " + s));
  return "📧 MAIL (seneste 24t)\n" + lines.join("\n");
}

(async () => {
  const sinceMs = Date.now() - 24 * 3600 * 1000;
  const sinceISO = new Date(sinceMs).toISOString();
  const sinceDate = new Date(sinceMs);

  let mailPart = "📧 MAIL\n• (kunne ikke hentes)";
  try {
    const emails = await fetchRecentEmails(cfg, sinceDate);
    console.error(`[rapport] ${emails.length} mails hentet`);
    mailPart = await summarizeEmails(cfg, emails);
  } catch (e) { console.error("[rapport] Gmail-fejl:", e.message); }

  let followupRes = null;
  let followupPart = "🔔 OPFØLGNINGER\n• (kunne ikke hentes)";
  try {
    followupRes = await buildFollowupReport(cfg);
    followupPart = formatFollowupReport(followupRes);
  } catch (e) { console.error("[rapport] Opfølgnings-fejl:", e.message); }

  let mondayPart = "📊 LEADS (Monday)\n• (kunne ikke hentes)";
  try {
    mondayPart = formatMondayReport(await buildMondayReport(cfg, sinceISO), followupRes ? followupRes.unprocessed : undefined);
  } catch (e) { console.error("[rapport] Monday-fejl:", e.message); }

  const dato = new Date().toLocaleDateString("da-DK", { day: "numeric", month: "long" });
  const report = `📋 Puds og Plus — Daglig rapport (${dato})\nSidste 24 timer\n\n${mailPart}\n\n${followupPart}\n\n${mondayPart}`;

  console.log("\n" + report + "\n");

  if (DRY) { console.error("[rapport] --dry: intet sendt."); return; }

  const to = cfg.reportRecipient || "+4530803017";
  try {
    await sendIMessage(to, report);
    console.error("[rapport] ✅ Sendt til " + to);
  } catch (e) { console.error("[rapport] ❌ Kunne ikke sende:", e.message); process.exit(1); }
})().catch(e => { console.error("[rapport] FEJL:", e.message); process.exit(1); });
