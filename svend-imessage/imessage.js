/* Sender en iMessage via Mac'ens Messages-app (AppleScript).
   Kræver: Messages er logget ind, og at node/Terminal har lov til at styre
   Messages (System-indstillinger > Privatliv > Automatisering).
   Ingen npm-pakker — bruger den indbyggede 'osascript'. */
const { execFile } = require("child_process");

function sendIMessage(address, text) {
  return new Promise((resolve, reject) => {
    // Send via AppleScript. Vi sender teksten som argument (ingen shell-escaping-problemer).
    const script = `
on run {targetAddress, msgText}
  tell application "Messages"
    try
      set targetService to 1st account whose service type = iMessage
      set targetBuddy to participant targetAddress of targetService
      send msgText to targetBuddy
    on error
      set targetService to 1st service whose service type = iMessage
      set targetBuddy to buddy targetAddress of targetService
      send msgText to targetBuddy
    end try
  end tell
end run`;
    execFile("osascript", ["-e", script, address, text], (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(true);
    });
  });
}

module.exports = { sendIMessage };
