require("dotenv").config();
const axios = require("axios");
const logger = require("./logger");

/**
 * Shopify GraphQL API Client
 */
const client = axios.create({
    baseURL: `https://${process.env.SHOP}/admin/api/2025-10/graphql.json`,
    headers: {
        "X-Shopify-Access-Token": process.env.ACCESS_TOKEN,
        "Content-Type": "application/json"
    },
    timeout: 30000
});

/**
 * Find Shopify Variant by SKU
 */
async function getVariantBySku(sku) {

    try {

        const query = `
        {
            productVariants(first:1, query:"sku:${sku}") {
                edges {
                    node {
                        id
                        sku
                        product {
                            id
                        }
                        inventoryItem {
                            id
                        }
                    }
                }
            }
        }`;

        const response = await client.post("", { query });

        if (response.data.errors) {

            logger.writeLog(`GraphQL Error while searching SKU ${sku}`);
            logger.writeLog(JSON.stringify(response.data.errors));

            return null;
        }

        const variants = response.data?.data?.productVariants?.edges || [];

        if (variants.length === 0) {

            logger.writeLog(`SKU Not Found : ${sku}`);

            return null;
        }

        return variants[0].node;

    } catch (err) {

        logger.writeLog(`Find SKU Error : ${sku}`);
        logger.writeLog(err.message);

        return null;
    }

}

/**
 * Update Shopify Product Price
 */
async function updatePrice(productId, variantId, price) {

    try {

        const mutation = `
        mutation productVariantsBulkUpdate(
            $productId: ID!,
            $variants: [ProductVariantsBulkInput!]!
        ) {
            productVariantsBulkUpdate(
                productId: $productId,
                variants: $variants
            ) {

                productVariants{
                    id
                    price
                }

                userErrors{
                    field
                    message
                }

            }
        }`;

        const variables = {
            productId,
            variants: [
                {
                    id: variantId,
                    price: price.toString()
                }
            ]
        };

        const response = await client.post("", {
            query: mutation,
            variables
        });

        const errors =
            response.data?.data?.productVariantsBulkUpdate?.userErrors || [];

        if (errors.length > 0) {

            logger.writeLog(
                `Price Update Failed : Variant ${variantId}`
            );
            logger.writeLog(JSON.stringify(errors));

            return false;
        }

        return true;

    } catch (err) {

        logger.writeLog("Price Update Error");
        logger.writeLog(err.message);

        return false;
    }

}

/**
 * Update Shopify Inventory
 */
async function updateInventory(inventoryItemId, quantity) {

    try {

        const mutation = `
        mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {

            inventorySetQuantities(input:$input){

                inventoryAdjustmentGroup{
                    createdAt
                }

                userErrors{
                    field
                    message
                }

            }

        }`;

        const variables = {

            input: {

                name: "available",

                reason: "correction",

                ignoreCompareQuantity: true,

                quantities: [

                    {

                        inventoryItemId,

                        locationId: process.env.LOCATION_ID,

                        quantity

                    }

                ]

            }

        };

        const response = await client.post("", {

            query: mutation,

            variables

        });

        const errors =
            response.data.data.inventorySetQuantities.userErrors;

        if (errors.length > 0) {

            logger.writeLog(
                `Inventory Update Failed : Inventory Item ${inventoryItemId}`
            );
            logger.writeLog(JSON.stringify(errors));

            return false;

        }

        return true;

    } catch (err) {

        logger.writeLog("Inventory Update Error");
        logger.writeLog(err.message);

        return false;

    }

}

/**
 * ---------------------------------------------------------
 * Get Shopify Fulfillment
 * ---------------------------------------------------------
 * Returns the first fulfillment for an order.
 *
 * @param {string} orderId Shopify Order GID
 * @returns {Object|null}
 * ---------------------------------------------------------
 */
async function getFulfillment(orderId) {

    try {

        const query = `
        query ($id: ID!) {

            order(id: $id) {

                fulfillments(first: 10) {

                    nodes {

                        id
                        status

                        trackingInfo {
                            company
                            number
                        }

                    }

                }

            }

        }`;

        const variables = {
            id: orderId
        };

        const response = await client.post("", {
            query,
            variables
        });

        // GraphQL Errors
        if (response.data.errors) {

            logger.writeLog("Get Fulfillment Error");
            logger.writeLog(JSON.stringify(response.data.errors));

            return null;
        }

        const fulfillments =
            response.data.data.order.fulfillments.nodes;

        if (fulfillments.length === 0) {

            logger.writeLog(
                `No fulfillment found for Order ${orderId}`
            );

            return null;
        }

        return fulfillments[0];

    } catch (err) {

        logger.writeLog("Get Fulfillment Failed");
        logger.writeLog(err.stack || err.message);

        return null;

    }

}



/**
 * Get Shopify Order by Order Number
 */
async function getOrderByNumber(orderNumber) {

    try {

        const query = `
        {
            orders(
                first: 1,
                query: "name:${orderNumber}"
            ) {
                edges {
                    node {

                        id
                        name
                        displayFulfillmentStatus

                        fulfillments {

                            id
                            status

                            trackingInfo {
                                company
                                number
                            }

                        }
                    }
                }
            }
        }`;

        const response = await client.post("", { query });

        if (response.data.errors) {

            console.log(response.data.errors);
            logger.writeLog(JSON.stringify(response.data.errors));

            return null;
        }

        const orders = response.data.data.orders.edges;

        if (orders.length === 0) {

            console.log(`Order ${orderNumber} not found.`);
            return null;
        }

        return orders[0].node;

    } catch (err) {

        logger.writeLog(err.stack || err.message);

        return null;
    }

}

/**
 * ---------------------------------------------------------
 * Get Fulfillment Order
 * ---------------------------------------------------------
 *
 * Returns the Fulfillment Order ID for a Shopify Order.
 *
 * @param {string} orderId Shopify Order ID
 * @returns {Object|null}
 * ---------------------------------------------------------
 */
async function getFulfillmentOrder(orderId) {

    try {

        const query = `
        query GetFulfillmentOrder($id: ID!) {

            order(id: $id) {

                fulfillmentOrders(first: 10) {

                    nodes {

                        id
                        status

                    }

                }

            }

        }`;

        const variables = {
            id: orderId
        };

        const response = await client.post("", {
            query,
            variables
        });

        if (response.data.errors) {

            logger.writeLog(JSON.stringify(response.data.errors));

            return null;

        }

        const orders =
            response.data.data.order.fulfillmentOrders.nodes;

        if (!orders.length) {

            logger.writeLog("No Fulfillment Orders found.");

            return null;

        }

        return orders[0];

    } catch (err) {

        logger.writeLog(err.message);

        return null;

    }

}

/**
 * ---------------------------------------------------------
 * Create Fulfillment
 * ---------------------------------------------------------
 *
 * Creates a Shopify Fulfillment and adds
 * tracking information.
 *
 * @param {string} fulfillmentOrderId
 * @param {string} trackingNumber
 * @param {string} carrier
 * @returns {boolean}
 * ---------------------------------------------------------
 */
async function createFulfillment(
    fulfillmentOrderId,
    trackingNumber,
    carrier
) {

    try {

        const mutation = `
        mutation fulfillmentCreate(
            $fulfillment: FulfillmentInput!
        ) {

            fulfillmentCreate(
                fulfillment: $fulfillment
            ) {

                fulfillment {
                    id
                    status
                }

                userErrors {
                    field
                    message
                }

            }

        }`;

        const variables = {

            fulfillment: {

                notifyCustomer: false,

                trackingInfo: {

                    number: trackingNumber,
                    company: carrier

                },

                lineItemsByFulfillmentOrder: [

                    {

                        fulfillmentOrderId: fulfillmentOrderId

                    }

                ]

            }

        };

        const response =
            await client.post("", {

                query: mutation,

                variables

            });

        const result =
            response.data.data.fulfillmentCreate;

        if (result.userErrors.length > 0) {

            logger.writeLog(
                JSON.stringify(result.userErrors)
            );

            return false;

        }

        logger.writeLog(
            `Fulfillment Created : ${result.fulfillment.id}`
        );

        return true;

    } catch (err) {

        logger.writeLog(err.message);

        return false;

    }

}

/**
 * Update Shopify Fulfillment Tracking
 */
async function updateTracking(
    fulfillmentId,
    trackingNumber,
    carrier
) {

    const mutation = `

    mutation fulfillmentTrackingInfoUpdate(
        $fulfillmentId: ID!,
        $trackingInfo: FulfillmentTrackingInput!
    ) {

      fulfillmentTrackingInfoUpdate(

        fulfillmentId:$fulfillmentId,

        trackingInfo:$trackingInfo

      ) {

        fulfillment {

          id

        }

        userErrors {

          message

        }

      }

    }

    `;

    const variables = {

        fulfillmentId,

        trackingInfo: {

            company: carrier,

            number: trackingNumber

        }

    };

    try {

        const response = await client.post("", {
            query: mutation,
            variables
        });

        const errors =
            response.data?.data?.fulfillmentTrackingInfoUpdate?.userErrors || [];

        if (errors.length > 0) {

            logger.writeLog("Tracking Update Failed");
            logger.writeLog(JSON.stringify(errors));

            return false;
        }

        return true;

    } catch (err) {

        logger.writeLog("Tracking Update Error");
        logger.writeLog(err.message);

        return false;

    }

}

module.exports = {

    getVariantBySku,
    updatePrice,
    updateInventory,

    getOrderByNumber,
    getFulfillmentOrder,
    createFulfillment

};