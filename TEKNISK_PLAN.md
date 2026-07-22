# Svend — Teknisk Plan (hvordan agenten faktisk bygges)

> Her er beviset for, at Svend kan bygges i virkeligheden — ikke bare en idé.
> Skrevet så en ikke-teknisk person kan forstå det, men konkret nok til at en udvikler kan gå i gang.

---

## 1. Hvad sker der, når en kunde ringer? (hele kæden)

```
  Kunde ringer
      │
      ▼
 1. TELEFONI          Nummeret er viderestillet til Svend.
    (Twilio)          Opkaldet lander i systemet.
      │
      ▼
 2. TALE → TEKST      Kundens stemme laves om til tekst i realtid.
    (Deepgram/Whisper, dansk)
      │
      ▼
 3. HJERNEN           Teksten sendes til sprogmodellen (Claude), som
    (Claude, Opus/Sonnet)  forstår hvad kunden vil, og bestemmer svaret.
      │                    Den kender firmaets info, kalender og regler.
      ▼
 4. TEKST → TALE      Svarene laves om til naturlig dansk tale.
    (ElevenLabs, dansk stemme)
      │
      ▼
 5. HANDLING          Booker i kalender, sender SMS, gemmer lead.
    (Kalender-API + SMS + database)
      │
      ▼
 Mester får SMS   +   Kunde får bekræftelse
```

Hele rundturen (kunde taler → Svend svarer) skal ske på **under ~1 sekund**, så samtalen
føles naturlig. Det er teknisk muligt i dag med streaming (delene arbejder samtidig, ikke i kø).

---

## 2. Byggeklodserne (og hvorfor)

| Del | Værktøj (forslag) | Hvorfor |
|-----|-------------------|---------|
| Telefoni | **Twilio** (Programmable Voice) | Kan tage imod opkald, viderestille, og "tale" via kode. Dansk nummer muligt. |
| Tale → tekst | **Deepgram** el. **Whisper** | God dansk genkendelse, realtid, lav forsinkelse. |
| Hjernen | **Claude (Opus/Sonnet)** | Forstår dansk fremragende, følger regler, kan kalde værktøjer (booke, sende SMS). |
| Tekst → tale | **ElevenLabs** | Naturlige danske stemmer. Vælg én der lyder venlig og professionel. |
| SMS | **Twilio / en dansk SMS-gateway** | Sender resumé til mester + bekræftelse til kunde. |
| Kalender | **Google Calendar API** (evt. Microsoft/andre) | De fleste håndværkere har Google eller kan få det. |
| Database | **Postgres** (fx Supabase) | Gemmer kunder, opkald, leads, opgaver. |
| Overblik/app | **Simpel web-app** (Next.js el. lign.) | Mester ser opkald og opgaver. Kan komme senere. |

> **Vigtigt princip:** Byg det som "lim" mellem færdige tjenester. Du skal IKKE bygge en
> sprogmodel eller talegenkendelse selv — du kobler eksisterende, gode værktøjer sammen.
> Det er det, der gør, at én person kan bygge og drive det.

---

## 3. Svends "hjerne" — hvad han får at vide (systemprompt)

Selve intelligensen kommer af de instrukser, Svend får. For hver kunde fyldes disse ind:

```
Du er "Svend", telefonassistent for [FIRMANAVN], et [FAG]-firma i [BY].
Du taler venligt, kort og naturligt dansk — som en dygtig, rolig kontorsvend.

DIN OPGAVE:
- Tag pænt imod kunden og find ud af, hvad de har brug for.
- Ved akutte opgaver (vandskade, strømsvigt, indbrud): vær beroligende og hurtig.
- Indsaml: navn, telefonnummer, adresse, hvad opgaven er, hvor akut den haster.
- Tilbyd en ledig tid fra kalenderen og book den, hvis kunden vil.
- Afvis pænt telefonsælgere og reklameopkald.

REGLER:
- Lov ALDRIG en pris eller en garanti. Sig: "Det finder [mester] på plads, når han ser opgaven."
- Er du i tvivl, så tag besked og sig, at [mester] ringer tilbage.
- Vær ærlig, hvis nogen spørger, om du er en digital assistent.
- Hold svarene korte — det er en telefonsamtale, ikke et brev.

VÆRKTØJER du kan bruge:
- tjek_ledige_tider()       → find ledige tidspunkter
- book_opgave(...)          → læg opgaven i kalenderen
- send_sms_til_mester(...)  → giv mester besked nu
- send_bekraeftelse(...)    → send kunden en SMS-bekræftelse
```

Det er sådan, ét system kan betjene 1.000 forskellige håndværkere: **samme motor, forskellig prompt.**

---

## 4. Pakke-forskellene teknisk

| Funktion | Sådan laves den |
|----------|-----------------|
| Basis: tag besked + SMS | Hjerne + tale + SMS. Ingen kalender. Simpelt. |
| Pro: booking | Tilføj kalender-API + værktøjet `book_opgave`. |
| Pro: kvalificering | Ekstra spørgsmål i prompten + gem strukturerede felter. |
| Premium: udgående opkald | Twilio ringer *ud* fra en liste af gamle leads. |
| Premium: anmeldelser | Efter opgave: automatisk SMS med Google-anmeldelseslink. |
| Premium: CRM-integration | Kobling til fx Ordrestyring/Minuba via deres API. |

Alt bygger oven på den samme kerne. Du bygger kernen **én gang** og skruer funktioner til/fra pr. kunde.

---

## 5. Sådan bygger du det trin for trin (MVP → salgsklar)

**Fase 1 — Bevis at det virker (1–2 uger)**
1. Køb et Twilio-nummer.
2. Byg den simple kæde: opkald → tale-til-tekst → Claude → tekst-til-tale → svar.
3. Få Svend til at tage imod ét opkald og sende dig en SMS. **Det er MVP'en.**

**Fase 2 — Gør den salgbar (2–4 uger)**
4. Tilføj kalender-booking (Google Calendar).
5. Tilføj kundetilpasning (firmanavn, fag, åbningstider i en fil pr. kunde).
6. Lav en simpel side, hvor mester ser sine opkald.

**Fase 3 — Første betalende kunde**
7. Sæt Svend op for ÉN rigtig håndværker (måske gratis den første måned mod en anbefaling).
8. Ret alt det, der driller i praksis. Nu har du et bevis + en reference.

**Fase 4 — Skalér**
9. Automatisér onboarding (en formular → ny Svend på få minutter).
10. Ring til de næste 50 håndværkere med den plan, der ligger i [SALGSPLAN.md].

> Du behøver **ikke** have alt klar for at begynde at sælge. Du kan sælge på demoen og
> onboarde kunden, mens de sidste funktioner bygges. Sælg og byg parallelt.

---

## 6. Vigtige forbehold (så planen er ærlig)

- **Dansk tale skal testes grundigt.** Genkendelse af dialekter og baggrundsstøj (byggeplads!)
  er det sværeste. Test tidligt med rigtige opkald.
- **Forsinkelse (latency)** skal holdes lav, ellers føles samtalen kejtet. Brug streaming.
- **GDPR:** Opbevar data i EU, lav databehandleraftale, optag kun opkald med samtykke.
- **Fallback:** Hvis Svend går i stå, skal opkaldet altid kunne ende med "jeg tager besked og
  [mester] ringer dig op" — så en kunde aldrig taber tråden helt.
- **Priser på værktøjer** ændrer sig. Hold øje med din omkostning pr. opkald, så marginen holder.

Ingen af disse er showstoppere — de er kendte problemer med kendte løsninger. Men de skal
håndteres, og derfor står de her. En ærlig plan er en skudsikker plan.
