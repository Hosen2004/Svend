# 🔧 Svend på iMessage

Få Svend til at svare rigtige iMessages: en kunde skriver til dit nummer, Svend
svarer på dansk, giver en pris, booker en tid — og sender **dig** en besked med opgaven.

Ingen npm-pakker. Ren Node. Virker gratis (regelbaseret) og kan opgraderes med Claude
for helt naturlig samtale.

---

## Prøv det FØRST uden iMessage (30 sekunder)

Du kan skrive med Svend direkte i terminalen, før du sætter noget som helst op:

```bash
cd svend-imessage
node simulate.js      # skriv som en kunde. "slut" for at stoppe.
node test.js          # kør de automatiske tests (skal vise "0 fejl")
```

Det beviser at hjernen virker. Derefter kobler du den på iMessage nedenfor.

---

## Sådan hænger det sammen

```
  Kunde skriver iMessage
          │
          ▼
   BlueBubbles  ──(webhook)──▶  Svend (server.js)  ──▶  svarer kunden på iMessage
   (gratis app,                      │
    "ørerne")                        └──▶  sender DIG en besked med opgaven
```

- **BlueBubbles** er en gratis, open source-app, der læser dine iMessages og sender dem
  videre til Svend. Den klarer alt det svære med Apples system, så vi slipper.
- **Svend** (denne mappe) er hjernen, der svarer og booker.

---

## Opsætning (trin for trin)

Du skal bruge: en **Mac der altid er tændt** (den er "kontoret"), logget ind på den
**Apple ID / iMessage**, kunderne skal skrive til.

### 1) Installér BlueBubbles-serveren
1. Hent den gratis på **bluebubbles.app** (vælg "Server" til Mac).
2. Følg deres guide. Undervejs skal du give den **Full Disk Access** (så den kan læse
   iMessages) — den fortæller dig præcis hvordan.
3. Sæt et **server-password** (husk det).

### 2) Sæt Svend op
```bash
cd svend-imessage
cp config.example.json config.json
```
Åbn `config.json` og udfyld:
- `firm` — dit firmanavn
- `tradeKey` — dit fag (`vvs`, `elektriker`, `vinduespudser`, `fugemand`, `tomrer`, `maler`, `murer`, `kloak`)
- `ownerPhone` — dit eget nummer (hertil får du leads)
- (valgfrit) `useClaude: true` + `anthropicApiKey` for naturlig samtale — se nederst

### 3) Giv Svend lov til at sende beskeder
Første gang beder macOS om lov til, at Svend må styre Messages:
**Systemindstillinger → Privatliv & sikkerhed → Automatisering** → tillad Terminal/Node at styre **Beskeder**.

### 4) Start Svend
```bash
node server.js
```
Du ser: `Svend kører for … Lytter på http://localhost:8787/webhook`

### 5) Peg BlueBubbles på Svend
I BlueBubbles-appen: **Settings → Webhooks → tilføj** `http://localhost:8787/webhook`
og vælg event **"New Messages"**. Gem.

### 6) Test
Bed en ven skrive en iMessage til dit nummer. Svend svarer — og du får en besked med opgaven. 🎉

---

## Gratis vs. Claude (naturlig samtale)

| | Gratis (regelbaseret) | Med Claude |
|---|---|---|
| Pris | 0 kr | nogle få øre pr. samtale |
| Sådan | virker med det samme | sæt `useClaude:true` + `anthropicApiKey` i config |
| Samtale | god, styret | helt naturlig, forstår alt |
| Nøgle | — | hentes på console.anthropic.com |

Anbefaling: start **gratis**, og slå Claude til når du vil have den bedste oplevelse.
Model `claude-haiku-4-5-20251001` er billigst; skift til `claude-sonnet-5` for endnu bedre svar.

---

## Ærligt om skalering (vigtigt for forretningen)

iMessage-via-Mac er **perfekt til en gratis prototype** og til at vise en håndværker "prøv
at skrive til det her nummer". Men:

- Det kræver **én Mac + ét Apple ID pr. håndværker** — det skalerer tungt til mange kunder.
- Apple laver ikke iMessage til virksomheds-brug ad denne vej.

**Til et rigtigt produkt, du sælger til mange:** brug **SMS via Twilio** i stedet (samme
hjerne, `brain.js`, kan genbruges 1:1). SMS virker på ALLE telefoner, er lavet til
virksomheder, og skalerer uendeligt. Se `../svend/TEKNISK_PLAN.md`.

> Kort sagt: **iMessage = gratis demo i dag. SMS/Twilio = når du skal sælge i skala.**
> Hjernen er den samme — kun "røret" ud til kunden skifter.

---

## Filer

| Fil | Hvad |
|-----|------|
| `simulate.js` | Skriv med Svend i terminalen (test uden iMessage) |
| `test.js` | Automatiske tests (7 stk, skal vise 0 fejl) |
| `server.js` | Webhook-server: modtager iMessages, svarer, booker |
| `brain.js` | Svends hjerne (regelbaseret + valgfri Claude) |
| `trades.js` | Priser og fag — **ret dine priser her** |
| `imessage.js` | Sender iMessages via Mac'ens Messages-app |
| `store.js` | Gemmer samtaler + leads i `data/*.json` |
| `config.example.json` | Skabelon til din `config.json` |
