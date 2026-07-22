# 🔧 Svend — Din digitale svend, der aldrig misser et opkald

En AI-telefonassistent bygget til at sælge til danske håndværkervirksomheder.
Svend besvarer hvert opkald 24/7, booker opgaver i kalenderen og sender mester en SMS —
så håndværkeren aldrig mister en kunde til konkurrenten igen.

---

## Problemet Svend løser

Håndværkere arbejder med hænderne og kan ikke tage telefonen. Ca. **1 ud af 4 opkald bliver
aldrig besvaret**, og **8 ud af 10 kunder ringer bare videre** til den næste håndværker.
Hvert tabt opkald er en tabt opgave til flere tusinde kroner — hver uge.

Svend fanger de opkald. Det er hele idéen.

---

## Hvorfor det sælger sig selv

> **Én reddet opgave om måneden betaler for hele abonnementet — flere gange.**

En tabt VVS- eller el-opgave koster nemt 5.000–15.000 kr. Svend koster 995–3.995 kr/md.
Regnestykket er så tydeligt, at kunden selv siger ja. Derfor kan det lukkes over telefon.

---

## De 3 pakker

| | Basis | Professionel ⭐ | Premium |
|---|---|---|---|
| Pris/md | **995 kr** | **1.995 kr** | **3.995 kr** |
| Opstart | 1.495 kr | 1.995 kr | 2.995 kr |
| Svarer 24/7 + SMS til mester | ✔ | ✔ | ✔ |
| Booking i kalender + kvalificering | – | ✔ | ✔ |
| Opfølgning, anmeldelser, CRM, rapport | – | – | ✔ |

De fleste vælger **Professionel**. Det er med vilje — se [FORRETNINGSMODEL.md](FORRETNINGSMODEL.md).

---

## Hvad du tjener (kort)

- Margin pr. kunde: **~75%** (teknologien gør arbejdet, ikke dyre lønninger).
- 50 kunder ≈ **81.500 kr/md** i fortjeneste ≈ knap **1 mio. kr/år**.
- Tilbagevendende indtægt: sælg én gang, tjen hver måned.
- Marked: **~35.000 håndværkere i Danmark**. Selv 1% = 350 kunder.

---

## Filerne i projektet

| Fil | Hvad det er |
|-----|-------------|
| **[demo.html](demo.html)** | ⭐ Den **live demo** kunden prøver. Vælg fag → snak med Svend via **SMS** eller **rigtig tale (mikrofon)** → få et **pristilbud** (tilpasset faget) → book en tid. Det er den, mailen linker til. |
| **[email.html](email.html)** | Den **marketing-mail** du sender ud. Ren HTML (virker i Gmail/Outlook), med knap ind til demoen. Erstat `{{...}}`-felterne og indsæt i dit email-værktøj. |
| **[index.html](index.html)** | Salgs- og landingssiden. Live "opkald"-demo, gevinst-beregner, pakker, garanti, FAQ. Knapperne fører videre til [demo.html](demo.html). |
| **[FORRETNINGSMODEL.md](FORRETNINGSMODEL.md)** | Priser, dine omkostninger, hvad du tjener pr. kunde, skalering. |
| **[SALGSPLAN.md](SALGSPLAN.md)** | Skudsikkert telefon-manuskript ord for ord + svar på hvert nej. |
| **[TEKNISK_PLAN.md](TEKNISK_PLAN.md)** | Hvordan Svend faktisk bygges — trin for trin, med rigtige værktøjer. |

### Sådan hænger det sammen (email marketing-flowet)

```
  Du sender email.html  ──▶  Håndværkeren trykker "Prøv Svend live"  ──▶  demo.html
     (via MailerLite/                                                    (vælg fag, snak på
      Mailchimp/Brevo)                                                    SMS + tale, book)
                                                                              │
                                                                              ▼
                                                                     index.html#priser
                                                                       (ser pakker → køber)
```

**Vigtigt:** For at "Prøv live"-knappen virker, skal `demo.html` og `index.html` ligge på en
webadresse (fx via GitHub Pages, Netlify, eller dit eget domæne). Sæt så den adresse ind i
`{{DEMO_URL}}` i [email.html](email.html). Emails kan ikke køre demoen selv — derfor en knap.

### Tilpas priser pr. branche (customizeable)

Alle fag og priser ligger øverst i [demo.html](demo.html) i `const TRADES = {...}` under
kommentaren **">>> ÆNDRE PRISER OG FAG HER <<<"**. Ret priser, tilføj varer, eller lav et
helt nyt fag ved at kopiere en blok. Beregneren og Svend tilpasser sig automatisk.

---

## Sådan kommer du i gang (3 skridt)

1. **Åbn [index.html](index.html)** i din browser og se produktet. Det er din vigtigste salgsting.
2. **Læs [SALGSPLAN.md](SALGSPLAN.md)** — det er din drejebog til at ringe de første kunder op.
3. **Byg MVP'en** efter [TEKNISK_PLAN.md](TEKNISK_PLAN.md) — eller sælg på demoen først og byg
   parallelt med din første kunde.

> Du kan begynde at sælge, før alt er bygget. Sælg på demoen, onboard kunden, byg de sidste
> funktioner mens du har den første betalende kunde i hånden.

---

*Svend — bygget til danske håndværkere. Alle priser er ekskl. moms.*
