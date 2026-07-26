/* =============================================================================
   GMAIL — læser de seneste mails fra indbakken via IMAP (app-adgangskode).
   Kræver config.gmail = { user, appPassword }.
   ========================================================================== */
const { ImapFlow } = require("imapflow");
const { simpleParser } = require("mailparser");

async function fetchRecentEmails(cfg, sinceDate) {
  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user: cfg.gmail.user, pass: cfg.gmail.appPassword },
    logger: false,
  });
  const out = [];
  await client.connect();
  const lock = await client.getMailboxLock("INBOX");
  try {
    let uids = [];
    try { uids = await client.search({ since: sinceDate }, { uid: true }); } catch { uids = []; }
    if (uids && uids.length) {
      for await (const msg of client.fetch(uids, { source: true }, { uid: true })) {
        try {
          const p = await simpleParser(msg.source);
          out.push({
            from: (p.from && p.from.text) || "",
            subject: p.subject || "(intet emne)",
            date: p.date ? p.date.toISOString() : "",
            text: String(p.text || p.html || "").replace(/\s+/g, " ").trim().slice(0, 1200),
          });
        } catch { /* spring beskadiget mail over */ }
      }
    }
  } finally {
    lock.release();
  }
  await client.logout();
  return out;
}

module.exports = { fetchRecentEmails };
