const fs = require("fs");
const path = require("path");
const logger = require("./logger");

/**
 * Reads the latest downloaded .DAT file
 * Parses each record into a JavaScript object
 *
 * Returns:
 * [
 *   {
 *      sku: "SBM12-1-***",
 *      price: 95.43,
 *      qty: 16
 *   }
 * ]
 */

function parseLatest() {

    const downloadFolder = path.join(__dirname, "../download");

    const files = fs.readdirSync(downloadFolder)
        .filter(file => file.toLowerCase().endsWith(".dat"));

    if (files.length === 0) {
        throw new Error("No .DAT files found.");
    }

    // Sort by last modified date
    files.sort((a, b) => {
        const aTime = fs.statSync(path.join(downloadFolder, a)).mtimeMs;
        const bTime = fs.statSync(path.join(downloadFolder, b)).mtimeMs;
        return bTime - aTime;
    });

    const latestFile = files[0];

    console.log("Reading:", latestFile);

    const data = fs.readFileSync(
        path.join(downloadFolder, latestFile),
        "utf8"
    );

    const rows = data.trim().split(/\r?\n/);

    const products = [];

    rows.forEach((row, index) => {

        const c = row.split("|");

        try {

            if (c.length !== 9) {
                throw new Error("Invalid number of columns");
            }

            if (!/^\d{8}\.\d{4}$/.test(c[0])) {
                throw new Error("Invalid timestamp");
            }

            if (!c[1].trim()) {
                throw new Error("Missing SKU");
            }

            if (isNaN(Number(c[2]))) {
                throw new Error("Invalid price");
            }

            if (c[3] !== "USD") {
                throw new Error("Invalid currency");
            }

            if (!["EXCL", "INCL"].includes(c[4])) {
                throw new Error("Invalid price type");
            }

            if (!/^\d{8}$/.test(c[5])) {
                throw new Error("Invalid date");
            }

            if (isNaN(parseInt(c[6], 10))) {
                throw new Error("Invalid quantity");
            }

            if (!c[7].trim()) {
                throw new Error("Missing warehouse");
            }

            products.push({
                sku: c[1].trim(),
                price: parseFloat(c[2]),
                qty: parseInt(c[6], 10)
            });

        } catch (err) {

            console.log(`Row ${index + 1}: ${err.message}`);
            logger.writeLog(`Row ${index + 1}: ${err.message}`);

            // Skip invalid row
        }

    });

    return products;

}

module.exports = {
    parseLatest
};