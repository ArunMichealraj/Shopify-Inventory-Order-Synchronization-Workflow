/**
 * ---------------------------------------------------------
 * Shopify Inventory & Price Synchronization Service
 * ---------------------------------------------------------
 *
 * Project   : Shopify Inventory Sync
 * Company   : KV
 * Developer : Arun Michaelraj
 *
 * Description:
 * Downloads the latest inventory file from the FTP server,
 * updates Shopify inventory & prices,
 * exports new Shopify orders,
 * and stores the latest exported order date.
 *
 * Workflow
 * --------
 * FTP Download
 *      ↓
 * Parse DAT File
 *      ↓
 * Find Variant by SKU
 *      ↓
 * Update Price
 *      ↓
 * Update Inventory
 *      ↓
 * Fetch New Shopify Orders
 *      ↓
 * Export Order DAT
 *      ↓
 * Save Last Order Date
 * ---------------------------------------------------------
 */

const ftp = require("./ftp");
const parser = require("./parser");
const shopify = require("./shopify");
const logger = require("./logger");

const statusParser = require("./statusParser");
const statusService = require("./statusService");

/**
 * Main Sync Process
 */
async function runSync() {

    try {

        console.log("================================");
        console.log("Shopify Sync Started");
        console.log("================================");

        logger.writeLog("================================");
        logger.writeLog("Shopify Sync Started");
        logger.writeLog("================================");

        /**
         * ---------------------------------------------
         * STEP 1 : Download latest Inventory file
         * ---------------------------------------------
         */
        const inventoryDownloaded =
            await ftp.downloadLatestInventoryFile();

        if (!inventoryDownloaded) {

            console.log("No new Inventory file.");
            logger.writeLog("No new Inventory file.");

        } else {

            /**
             * -------------------------------------------------
             * STEP 2 : Parse latest DAT file
             * -------------------------------------------------
             */
            const products = parser.parseLatest();

            if (products.length === 0) {

                logger.writeLog("No products found.");

            } else {

                console.log(`Found ${products.length} products`);
                logger.writeLog(`Found ${products.length} products`);

                /**
                 * -------------------------------------------------
                 * STEP 3 : Update Shopify Price & Inventory
                 * -------------------------------------------------
                 */
                for (const product of products) {

                    // Find Shopify Variant using SKU
                    const variant = await shopify.getVariantBySku(product.sku);

                    if (!variant) {

                        console.log(`SKU Not Found : ${product.sku}`);
                        logger.writeLog(`SKU Not Found : ${product.sku}`);

                        continue;
                    }

                    /**
                     * Update Product Price
                     */
                    const priceUpdated = await shopify.updatePrice(
                        variant.product.id,
                        variant.id,
                        product.price
                    );

                    if (!priceUpdated) {

                        console.log(`Price Update Failed : ${product.sku}`);
                        logger.writeLog(`Price Update Failed : ${product.sku}`);

                        continue;
                    }

                    /**
                     * Update Inventory
                     */
                    const inventoryUpdated = await shopify.updateInventory(
                        variant.inventoryItem.id,
                        product.qty
                    );

                    if (!inventoryUpdated) {

                        console.log(`Inventory Update Failed : ${product.sku}`);
                        logger.writeLog(`Inventory Update Failed : ${product.sku}`);

                        continue;
                    }

                    console.log(`Updated : ${product.sku}`);
                    logger.writeLog(`Updated : ${product.sku}`);
                }

                logger.writeLog("Inventory Sync Completed");
            }
        }

        /**
         * ---------------------------------------------
         * STEP 4 : Download latest Order Status file
         * ---------------------------------------------
         */
        const statusDownloaded =
            await ftp.downloadLatestStatusFile();

        if (!statusDownloaded) {

            console.log("No new Order Status file.");
            logger.writeLog("No new Order Status file.");

        } else {

            /**
             * Parse Status File
             */
            const statusRecords =
                statusParser.parseLatestStatus();

            if (statusRecords.length > 0) {

                await statusService.processStatusUpdates(statusRecords);

                logger.writeLog("Order Status Sync Completed");

            } else {

                logger.writeLog("No status records found.");

            }
        }

        console.log("================================");
        console.log("Shopify Sync Completed");
        console.log("================================");

        return true;

    } catch (err) {

        console.log("================================");
        console.log("Shopify Sync Failed");
        console.log("================================");

        console.error(err);

        logger.writeLog("================================");
        logger.writeLog("Shopify Sync Failed");
        logger.writeLog(err.stack || err.message);
        logger.writeLog("================================");

        return false;
    }
}

module.exports = {
    runSync
};