const logger = require("./logger");
const shopify = require("./shopify");

/**
 * ---------------------------------------------------------
 * Process Order Status Updates
 * ---------------------------------------------------------
 *
 * Reads parsed status records and creates Shopify
 * fulfillments with tracking information.
 *
 * @param {Array} records Parsed status records
 * @returns {boolean}
 * ---------------------------------------------------------
 */
async function processStatusUpdates(records) {


    try {

        if (!records || records.length === 0) {

            console.log("No status records found.");
            logger.writeLog("No status records found.");

            return false;
        }

        console.log(`Processing ${records.length} status record(s)...`);
        logger.writeLog(`Processing ${records.length} status record(s)...`);

        for (const item of records) {

            try {

                console.log("================================");
                console.log(`Order Number : ${item.orderNumber}`);
                console.log(`SKU          : ${item.sku}`);
                console.log(`Status       : ${item.status}`);
                console.log(`Tracking No  : ${item.trackingNumber}`);
                console.log("================================");

                logger.writeLog(
                    `Processing Order ${item.orderNumber} | SKU ${item.sku}`
                );

                /**
                 * -----------------------------------------
                 * STEP 1 : Find Shopify Order
                 * -----------------------------------------
                 */
                const order = await shopify.getOrderByNumber(item.orderNumber);

                if (!order) {

                    console.log(`Order not found : ${item.orderNumber}`);
                    logger.writeLog(`Order not found : ${item.orderNumber}`);

                    continue;
                }

                console.log(`Shopify Order ID : ${order.id}`);
                logger.writeLog(`Shopify Order ID : ${order.id}`);

                /**
                 * -----------------------------------------
                 * STEP 2 : Get Fulfillment Order
                 * -----------------------------------------
                 */
                const fulfillmentOrder =
                    await shopify.getFulfillmentOrder(order.id);

                if (!fulfillmentOrder) {

                    console.log(
                        `No Fulfillment Order found for ${item.orderNumber}`
                    );

                    logger.writeLog(
                        `No Fulfillment Order found for ${item.orderNumber}`
                    );

                    continue;
                }

                console.log(
                    `Fulfillment Order ID : ${fulfillmentOrder.id}`
                );

                console.log(JSON.stringify(fulfillmentOrder, null, 2), "fulfillmentOrder");

                /**
                 * -----------------------------------------
                 * STEP 3 : Create Fulfillment
                 * -----------------------------------------
                 */
                const fulfilled =
                    await shopify.createFulfillment(
                        fulfillmentOrder.id,
                        item.trackingNumber,
                        item.carrier
                    );

                if (fulfilled) {

                    console.log(
                        `Order ${item.orderNumber} fulfilled successfully.`
                    );

                    logger.writeLog(
                        `Order ${item.orderNumber} fulfilled successfully.`
                    );

                } else {

                    console.log(
                        `Fulfillment failed for ${item.orderNumber}`
                    );

                    logger.writeLog(
                        `Fulfillment failed for ${item.orderNumber}`
                    );

                }

            } catch (err) {

                console.log(
                    `Failed processing Order ${item.orderNumber}`
                );

                console.error(err);

                logger.writeLog(
                    `Failed processing Order ${item.orderNumber}`
                );

                logger.writeLog(err.stack || err.message);
            }
        }

        console.log("================================");
        console.log("Order Status Processing Completed");
        console.log("================================");

        logger.writeLog("Order Status Processing Completed");

        return true;

    } catch (err) {

        console.log("================================");
        console.log("Status Update Failed");
        console.log("================================");

        console.error(err);

        logger.writeLog("Status Update Failed");
        logger.writeLog(err.stack || err.message);

        return false;
    }

}

module.exports = {
    processStatusUpdates
};