/* =============================================================================
   TRÆNING — chefen kan lære Noah op via beskeder (priser, sprog, tone, regler).
   En besked der starter med "noah:" (eller træn:/opdater:/chef:) fra et
   whitelistet nummer bliver en INSTRUKTION. Claude fletter den ind i en
   vedvarende instruks-tekst (data/training.md), som lægges ind i Noahs hjerne.
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const TFILE = path.join(__dirname, "data", "training.md");

function loadTraining() {
  try { return fs.readFileSync(TFILE, "utf8").trim(); } catch { return ""; }
}
function saveTraining(text) {
  try { fs.mkdirSync(path.dirname(TFILE), { recursive: true }); fs.writeFileSync(TFILE, text); }
  catch (e) { console.error("[Træning] kunne ikke gemme:", e.message); }
}

// Genkend en trænings-besked (skal starte med et nøgleord + kolon)
const TRIGGER = /^\s*(noah|træn|traen|opdater|chef|admin)\s*:/i;
function isTraining(text) { return TRIGGER.test(text || ""); }
function stripTrigger(text) { return String(text || "").replace(TRIGGER, "").trim(); }

function parseLoose(raw) {
  let s = String(raw || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try { return JSON.parse(s); } catch { /* prøv at fiske objektet ud */ }
  const m = s.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* giv op */ } }
  return null;
}

/* Flet en ny instruktion ind i de eksisterende instrukser (via Claude). */
async function applyInstruction(current, instruction, cfg) {
  const navn = cfg.agentName || "Noah";
  const system = `Du hjælper chefen for ${cfg.firm} med at vedligeholde instrukserne til deres SMS-assistent "${navn}".
Du får den NUVÆRENDE instruks-tekst og en NY besked fra chefen. Lav en opdateret komplet instruks-tekst:
- Ændrer chefen en PRIS eller en REGEL, så ret/erstat den relevante linje (det nyeste gælder — fjern det gamle modstridende).
- Er det noget NYT (tone, sprog, en regel, viden om firmaet), så tilføj det kort og klart.
- Behold alt det gamle der stadig gælder. Hold teksten ryddelig i punktform, på dansk.
- Opfind ALDRIG priser eller regler chefen ikke har sagt.

Returnér KUN gyldig JSON (ingen markdown, ingen kodeblokke):
{"training":"den KOMPLETTE opdaterede instruks-tekst","confirmation":"kort, venlig bekræftelse til chefen om præcis hvad du ændrede"}`;
  const user = `NUVÆRENDE INSTRUKSER:\n${current || "(ingen endnu)"}\n\nCHEFENS NYE BESKED:\n${instruction}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": cfg.anthropicApiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: cfg.model || "claude-haiku-4-5-20251001", max_tokens: 1500, system, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error("Claude " + res.status + ": " + (await res.text()).slice(0, 200));
  const data = await res.json();
  const raw = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
  const parsed = parseLoose(raw);
  if (!parsed || !parsed.training) {
    // fald tilbage: læg bare instruktionen til som en linje
    const merged = (current ? current + "\n" : "") + "- " + instruction;
    return { training: merged, confirmation: "✅ Noteret: " + instruction };
  }
  return { training: String(parsed.training).trim(), confirmation: parsed.confirmation || "✅ Opdateret." };
}

module.exports = { loadTraining, saveTraining, isTraining, stripTrigger, applyInstruction };
