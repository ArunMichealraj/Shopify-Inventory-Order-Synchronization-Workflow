const cron = require("node-cron");
const logger = require("./services/logger");
const { runSync } = require("./services/sync-service");
const ordersService = require("./services/orders");
const exporter = require("./services/exportOrders");
const ftp = require("./services/ftp");
const storage = require("./services/orderStorage");
const statusService = require("./services/statusService");

async function processJob() {

    try {

        logger.writeLog("====================================");
        logger.writeLog("Scheduler Job Started");
        logger.writeLog("====================================");

        // Step 1 - Sync Inventory & Price
        const syncSuccess = await runSync();

        if (!syncSuccess) {
            logger.writeLog("Inventory sync failed. Remaining steps skipped.");
            return;
        }

        // Step 2 - Sync Update Status to Order
        try {

            await statusService.processStatusUpdates();

        } catch (err) {

            logger.writeLog(
                `Status Update Failed : ${err.message}`
            );

        }

        /**
         * -------------------------------------------------
         * STEP 3 : Fetch new Shopify Orders
         * -------------------------------------------------
         */
        const orders = await ordersService.getOrders();

        if (orders.length === 0) {

            logger.writeLog("No new orders found.");

        } else {

            /**
             * -------------------------------------------------
             * STEP 3 : Export Orders to DAT File
             * -------------------------------------------------
             */
            const orderFile = exporter.exportOrders(orders);

            if (!orderFile) {

                console.log("Order export failed.");
                logger.writeLog("Order export failed.");

                return false;
            }

            console.log(`Order File Created : ${orderFile}`);
            logger.writeLog(`Order File Created : ${orderFile}`);

            /**
             * -------------------------------------------------
             * STEP 4 : Upload Order File
             * (Currently Local Copy Only)
             * -------------------------------------------------
             */

            const uploaded = await ftp.uploadFile(orderFile);

            /**
             * -------------------------------------------------
             * STEP 5 : Save latest exported order date
             * -------------------------------------------------
             */

            if (uploaded) {

                const latestOrderDate =
                    orders[orders.length - 1].node.createdAt;

                storage.saveLastOrderDate(latestOrderDate);

                console.log(`Last Order Date Saved : ${latestOrderDate}`);
                logger.writeLog(`Last Order Date Saved : ${latestOrderDate}`);

            } else {

                console.log("Order upload failed.");
                logger.writeLog("Order upload failed.");

            }
        }



        logger.writeLog("Scheduler Job Completed");

    } catch (err) {

        logger.writeLog(`Scheduler Error : ${err.message}`);
        console.error(err);

    }
}

async function startScheduler() {

    console.log(
        `[${new Date().toISOString()}] Scheduler Started`
    );

    // Run immediately when application starts
    await processJob();

    // ==========================================
    // TEMPORARY TEST - Order Status Only
    // ==========================================
    //await statusService.processStatusUpdates();

    // Run every day at 12:00 AM
    // cron.schedule("0 0 * * *", async () => {
    cron.schedule("*/30 * * * *", async () => {
        await processJob();
    }, {
        timezone: "Asia/Kolkata"
    });

}

module.exports = {
    startScheduler
};