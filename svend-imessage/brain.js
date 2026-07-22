/* =============================================================================
   SVEND — HJERNEN  (samtale-motor til iMessage)
   -----------------------------------------------------------------------------
   handleMessage(state, text, cfg, trade) -> { replies:[..], ownerNotify, lead, state }
   - Virker GRATIS uden nøgle (regelbaseret nedenfor).
   - Sætter du useClaude:true + en API-nøgle i config, svarer Svend med Claude
     (naturlig samtale). Fald-tilbage til regelbaseret hvis Claude fejler.
   ========================================================================== */

const kr = n => Math.round(n).toLocaleString("da-DK") + " kr";
const has = (t, arr) => arr.some(w => t.includes(w));

function detectItem(text, trade) {
  const t = text.toLowerCase();
  for (const it of trade.items) {
    if (has(t, it.match)) return it;
  }
  return null;
}

/* ---------- REGELBASERET HJERNE (altid tilgængelig, gratis) ---------- */
function ruleReply(state, text, cfg, trade) {
  const t = text.toLowerCase().trim();
  const replies = [];
  let ownerNotify = null, lead = null;

  const greetOnce = () => {
    if (!state.greeted) {
      state.greeted = true;
      replies.push(`Hej og velkommen til ${cfg.firm}! 🔧 Du skriver med Svend. Hvad kan jeg hjælpe med — skal du bruge en pris, eller vil du booke en tid?`);
      return true;
    }
    return false;
  };

  const AKUT = ["akut","haster","hurtigst","med det samme","vandskade","sprunget","fosser","oversvøm","strømmen gik","strøm gik","indbrud","låst ude","løber over","brand"];
  const PRICE = ["pris","kost","koster","tilbud","billig","estimat","hvad koster","hvad tager"];
  const BOOK  = ["book","bestil","tid","aftale","komme forbi","kan i komme","kan du komme","hvornår","besøg","kigge forbi"];
  const YES   = ["ja","jep","jeps","gerne","ok","okay","fint","perfekt","super","det lyder godt","helt sikkert","yes"];

  // --- Adresse-trin ---
  if (state.step === "awaitAddress") {
    state.address = text.trim();
    state.step = "awaitTime";
    replies.push(`Tak! 📍 Jeg har disse ledige tider:\n• I dag kl. 14:00\n• I morgen kl. 09:00\n• Fredag kl. 12:00\nHvad passer dig bedst?`);
    return { replies, ownerNotify, lead, state };
  }

  // --- Tids-trin ---
  if (state.step === "awaitTime") {
    state.time = text.trim();
    state.step = "booked";
    replies.push(`Så er det på plads! ✅ ${cfg.firm} kommer ${state.time}${state.address ? " på " + state.address : ""}. Du får en bekræftelse her, og vi glæder os til at hjælpe. Tak fordi du valgte os! 🙌`);
    lead = {
      contact: state.contact, akut: !!state.akut,
      opgave: state.opgave || `${trade.name}-opgave`,
      estimat: state.quoted ? kr(state.quoted) : "På besøg",
      adresse: state.address || "—", tid: state.time || "—",
    };
    ownerNotify = ownerCard(lead);
    return { replies, ownerNotify, lead, state };
  }

  // --- Akut (kan afbryde alt) ---
  if (has(t, AKUT)) {
    greetOnce();
    state.akut = true;
    const item = detectItem(t, trade);
    if (item) state.opgave = item.label;
    state.step = "awaitAddress";
    replies.push(`Det lyder akut — det tager vi alvorligt! 🚨 Jeg får en mand ud til dig hurtigst muligt. Hvad er adressen?`);
    ownerNotify = `🚨 AKUT via Svend: ${state.contact} skriver "${text.trim()}". Ring kunden op hurtigst muligt.`;
    return { replies, ownerNotify, lead, state };
  }

  // --- Pris / vare nævnt ---
  const item = detectItem(t, trade);
  if (has(t, PRICE) || item) {
    greetOnce();
    if (item) {
      state.opgave = item.label;
      state.quoted = Math.max(item.price, trade.min || 0);
      state.step = "quoted";
      const unitTxt = item.unit === "stk" ? "" : ` pr. ${item.unit}`;
      replies.push(`${item.label.charAt(0).toUpperCase() + item.label.slice(1)} koster ca. ${kr(item.price)}${unitTxt}. 👍 Det er vejledende — ${cfg.firm} bekræfter den endelige pris på stedet. Skal jeg booke en tid til dig?`);
    } else {
      state.step = "awaitJob";
      const eks = trade.items.slice(0, 4).map(i => `• ${i.label} — ${kr(i.price)}${i.unit==="stk"?"":`/${i.unit}`}`).join("\n");
      replies.push(`Det hjælper jeg med! Hvad skal du have lavet? Fx:\n${eks}\nSkriv hvad du mangler, så giver jeg en pris. 🙂`);
    }
    return { replies, ownerNotify, lead, state };
  }

  // --- Booking ønsket / bekræftelse efter tilbud ---
  if (has(t, BOOK) || (state.step === "quoted" && has(t, YES))) {
    greetOnce();
    state.step = "awaitAddress";
    replies.push(`Super! 📅 Hvad er adressen, jeg skal sende en mand ud til?`);
    return { replies, ownerNotify, lead, state };
  }

  // --- Ren hilsen ---
  if (greetOnce()) {
    return { replies, ownerNotify, lead, state };
  }

  // --- Tak / positivt ---
  if (has(t, ["tak","fedt","dejligt"])) {
    replies.push(`Selv tak! 🙂 Er der andet, jeg kan hjælpe med — en pris eller en tid?`);
    return { replies, ownerNotify, lead, state };
  }

  // --- Fald-tilbage: tag altid pænt imod, så kunden aldrig taber tråden ---
  state.fallbacks = (state.fallbacks || 0) + 1;
  if (state.fallbacks >= 2) {
    replies.push(`Jeg vil være sikker på, du får den bedste hjælp — jeg giver ${cfg.firm} besked, så ringer de dig op hurtigst muligt. 📞`);
    ownerNotify = `📩 Besked via Svend fra ${state.contact}: "${text.trim()}". Svend var i tvivl — ring kunden op.`;
    state.fallbacks = 0;
  } else {
    replies.push(`Det hjælper jeg gerne med! Vil du have en pris, eller skal jeg booke en tid til dig?`);
  }
  return { replies, ownerNotify, lead, state };
}

function ownerCard(lead) {
  return [
    "📩 NY OPGAVE via Svend",
    `Kunde: ${lead.contact}`,
    `Opgave: ${lead.opgave}`,
    `Estimat: ${lead.estimat}`,
    `Adresse: ${lead.adresse}`,
    `Tid: ${lead.tid}`,
    lead.akut ? "⚠️ AKUT" : "",
  ].filter(Boolean).join("\n");
}

/* ---------- CLAUDE-HJERNE (valgfri, naturlig samtale) ---------- */
function systemPrompt(cfg, trade) {
  const priser = trade.items
    .map(i => `- ${i.label}: ${kr(i.price)}${i.unit === "stk" ? "" : ` pr. ${i.unit}`}`)
    .join("\n");
  return `Du er "Svend", telefon- og SMS-assistent for ${cfg.firm}, et ${trade.name}-firma.
Du skriver med en KUNDE på iMessage. Skriv venligt, kort og naturligt dansk — som en dygtig, rolig kontorsvend. Aldrig kunstigt eller robotagtigt. Brug gerne et enkelt emoji, men ikke i hver besked.

DIN OPGAVE:
- Tag imod kunden, find ud af hvad de har brug for.
- Ved akut (vandskade, strømsvigt, indbrud): vær beroligende og hurtig, bed om adressen.
- Giv en VEJLEDENDE pris ud fra listen herunder. Sig altid, at ${cfg.firm} bekræfter den endelige pris på stedet.
- Book en tid: spørg om adresse, tilbud en ledig tid (i dag 14, i morgen 9, fredag 12), og bekræft.
- Lov ALDRIG en fast pris eller garanti. Er du i tvivl, så sig at ${cfg.firm} ringer kunden op.
- Hold hver besked kort — det er en SMS, ikke et brev.

VEJLEDENDE PRISER:
${priser}

Svar KUN med gyldig JSON i dette format (intet andet):
{"reply":"din besked til kunden","status":"chatting|urgent|booked","lead":{"opgave":"","estimat":"","adresse":"","tid":""}}
Udfyld "lead" felterne når du kender dem (ellers tom streng). Sæt status="booked" NÅR en tid er aftalt, "urgent" ved akut, ellers "chatting".`;
}

async function claudeReply(state, text, cfg, trade) {
  state.history = state.history || [];
  state.history.push({ role: "user", content: text });
  if (state.history.length > 12) state.history = state.history.slice(-12);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": cfg.anthropicApiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: cfg.model || "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: systemPrompt(cfg, trade),
      messages: state.history,
    }),
  });
  if (!res.ok) throw new Error("Claude API " + res.status + ": " + (await res.text()).slice(0, 200));
  const data = await res.json();
  const raw = (data.content && data.content[0] && data.content[0].text) || "";
  state.history.push({ role: "assistant", content: raw });

  let parsed;
  try { parsed = JSON.parse(raw); }
  catch { parsed = { reply: raw.trim() || "Beklager, prøv lige igen 🙂", status: "chatting", lead: {} }; }

  const replies = [parsed.reply];
  let ownerNotify = null, lead = null;
  if (parsed.status === "urgent") {
    ownerNotify = `🚨 AKUT via Svend fra ${state.contact}: "${text.trim()}". Ring kunden op hurtigst muligt.`;
  }
  if (parsed.status === "booked") {
    lead = {
      contact: state.contact, akut: false,
      opgave: (parsed.lead && parsed.lead.opgave) || `${trade.name}-opgave`,
      estimat: (parsed.lead && parsed.lead.estimat) || "På besøg",
      adresse: (parsed.lead && parsed.lead.adresse) || "—",
      tid: (parsed.lead && parsed.lead.tid) || "—",
    };
    ownerNotify = ownerCard(lead);
  }
  return { replies, ownerNotify, lead, state };
}

/* ---------- OFFENTLIG INDGANG ---------- */
async function handleMessage(state, text, cfg, trade) {
  state.contact = state.contact || "ukendt";
  if (cfg.useClaude && cfg.anthropicApiKey) {
    try {
      return await claudeReply(state, text, cfg, trade);
    } catch (e) {
      console.error("[Svend] Claude fejlede, bruger regelbaseret:", e.message);
      // falder pænt tilbage til regelbaseret
    }
  }
  return ruleReply(state, text, cfg, trade);
}

module.exports = { handleMessage, ownerCard };
