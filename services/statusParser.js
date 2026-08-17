const fs = require("fs");
const path = require("path");
const logger = require("./logger");

/**
 * ---------------------------------------------------------
 * Parse Latest Order Status File
 * ---------------------------------------------------------
 *
 * Reads the latest downloaded
 * SHOPIFY_ORD_STATUS*.dat file and converts each
 * record into a JavaScript object.
 *
 * File Format:
 * OrderNo|Line|Status|Qty|Carrier|Tracking|SKU|Invoice|ShipDate
 *
 * Example:
 * 1001|1|SHIPPED|2|ACAN|1Z333444DUMMY|0151-24WT|160086772|20190627
 *
 * Returns:
 * [
 *   {
 *     orderNumber,
 *     lineNumber,
 *     status,
 *     shippedQty,
 *     carrier,
 *     trackingNumber,
 *     sku,
 *     invoiceNumber,
 *     shipDate
 *   }
 * ]
 * ---------------------------------------------------------
 */
function parseLatestStatus() {

    try {

        /**
         * Status folder location
         */
        const folder = path.join(__dirname, "../status");

        /**
         * Check folder exists
         */
        if (!fs.existsSync(folder)) {

            console.log("Status folder not found.");
            logger.writeLog("Status folder not found.");

            return [];
        }

        /**
         * Get all Order Status DAT files
         */
        const files = fs.readdirSync(folder)
            .filter(file =>
                file.startsWith("SHOPIFY_ORD_STATUS") &&
                file.toLowerCase().endsWith(".dat")
            );

        if (files.length === 0) {

            console.log("No Order Status files found.");
            logger.writeLog("No Order Status files found.");

            return [];
        }

        /**
         * Sort by filename
         * Example:
         * SHOPIFY_ORD_STATUS.20260720.1642.dat
         */
        files.sort();

        const latestFile = files[files.length - 1];

        const latestPath = path.join(folder, latestFile);

        logger.writeLog(`Reading Status File : ${latestFile}`);

        /**
         * Read all records
         */
        const lines = fs.readFileSync(latestPath, "utf8")
            .split(/\r?\n/)
            .filter(line => line.trim() !== "");

        console.log(`Found ${lines.length} status record(s).`);
        logger.writeLog(`Found ${lines.length} status record(s).`);

        /**
         * Convert each line into object
         */
        return lines.map(line => {

            const data = line.split("|");

            return {

                // ERP Order Number
                orderNumber: data[0]?.trim() || "",

                // Line Number
                lineNumber: Number(data[1]) || 0,

                // SHIPPED / CANCELLED / etc.
                status: data[2]?.trim() || "",

                // Quantity shipped
                shippedQty: Number(data[3]) || 0,

                // Carrier
                carrier: data[4]?.trim() || "",

                // Tracking Number
                trackingNumber: data[5]?.trim() || "",

                // SKU
                sku: data[6]?.trim() || "",

                // Invoice Number
                invoiceNumber: data[7]?.trim() || "",

                // Ship Date
                shipDate: data[8]?.trim() || ""

            };

        });

    } catch (err) {

        console.log("Failed to parse Order Status file.");
        console.error(err.message);

        logger.writeLog("Failed to parse Order Status file.");
        logger.writeLog(err.message);

        return [];

    }

}

module.exports = {
    parseLatestStatus
};