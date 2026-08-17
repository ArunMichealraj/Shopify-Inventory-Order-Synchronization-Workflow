const fs = require("fs");
const path = require("path");

const logFolder = path.join(__dirname, "../logs");

// Create logs folder if it doesn't exist
if (!fs.existsSync(logFolder)) {
    fs.mkdirSync(logFolder);
}

// Generate log file name (e.g., sync-2026-07-02.log)
const today = new Date().toISOString().split("T")[0];
const logFile = path.join(logFolder, `sync-${today}.log`);

/**
 * Write log message with timestamp
 */
function writeLog(message) {

    const time = new Date().toLocaleString();

    const log = `[${time}] ${message}\n`;

    fs.appendFileSync(logFile, log);

    console.log(message);
}

module.exports = {
    writeLog
};