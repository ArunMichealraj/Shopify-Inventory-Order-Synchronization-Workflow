const fs = require("fs");
const path = require("path");

/**
 * ---------------------------------------------------------
 * Shopify Order Export Service
 * ---------------------------------------------------------
 *
 * Project   : Shopify Inventory Sync
 * Company   : KV
 * Developer : Arun Michaelraj
 *
 * Description:
 * Exports Shopify orders into a pipe-delimited (.DAT) file
 * for ERP integration.
 *
 * Output:
 * One record per Shopify line item.
 *
 * Example:
 * order_number|order_date|firstname|lastname|...
 * ---------------------------------------------------------
 */

function exportOrders(orders) {

    try {

        /**
         * --------------------------------------------
         * Create Export Folder
         * --------------------------------------------
         */
        const exportFolder = path.join(__dirname, "../export");

        if (!fs.existsSync(exportFolder)) {
            fs.mkdirSync(exportFolder, { recursive: true });
        }

        /**
         * --------------------------------------------
         * Generate File Name
         * Example:
         * SHOPIFY_ORDERS_202607151430.dat
         * --------------------------------------------
         */
        const now = new Date();

        const fileName =
            `SHOPIFY_PO_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}.dat`;

        const filePath = path.join(exportFolder, fileName);

        /**
         * Array to hold all file rows
         */
        const rows = [];

        /**
         * --------------------------------------------
         * Header Row
         * Remove this section if ERP doesn't require
         * column names.
         * --------------------------------------------
         */
        // rows.push([
        //     "order_number",
        //     "order_date",
        //     "firstname",
        //     "lastname",
        //     "ship_to_company",
        //     "ship_to_address1",
        //     "ship_to_address2",
        //     "ship_to_city",
        //     "ship_to_state",
        //     "ship_to_zip",
        //     "ship_to_phone",
        //     "billing_firstname",
        //     "billing_lastname",
        //     "billing_company",
        //     "order_notes",
        //     "billing_to_address1",
        //     "billing_to_address2",
        //     "billing_to_city",
        //     "billing_to_state",
        //     "billing_to_zip",
        //     "billing_to_phone",
        //     "customer_number",
        //     "customer_email",
        //     "sku",
        //     "quantity",
        //     "order_qty",
        //     "unit_price",
        //     "oracle_qty",
        //     "oracle_price",
        //     "total",
        //     "total_tax",
        //     "tax_state",
        //     "shipping_cost",
        //     "shipping_type",
        //     "order_total_price",
        //     "order_notes"
        // ].join("|"));

        /**
         * --------------------------------------------
         * Clean Data
         * Removes null, undefined, pipes and line breaks
         * --------------------------------------------
         */
        const clean = (value) => {

            if (value === null || value === undefined) {
                return "";
            }

            return String(value)
                .replace(/\|/g, " ")
                .replace(/\r?\n/g, " ")
                .trim();

        };

        /**
         * --------------------------------------------
         * Process Every Shopify Order
         * --------------------------------------------
         */
        orders.forEach(order => {

            const o = order.node;

            /**
             * Order Information
             */
            const orderNumber = clean(o.name.replace("#", ""));
            const orderDate = clean(o.createdAt.substring(0, 10));

            /**
             * Customer Information
             */
            const customerNumber =
                clean(o.customer?.legacyResourceId);

            const customerEmail =
                clean(o.customer?.email);

            /**
             * Shipping Address
             */
            const ship = o.shippingAddress || {};

            /**
             * Billing Address
             */
            const bill = o.billingAddress || {};

            /**
             * Order Notes
             */
            const orderNotes = clean(o.note);

            /**
             * Shipping Cost
             */
            const shippingCost =
                Number(
                    o.shippingLine?.originalPriceSet?.shopMoney?.amount || 0
                );

            /**
             * Total Tax
             */
            const totalTax =
                Number(
                    o.currentTotalTaxSet?.shopMoney?.amount || 0
                );

            /**
             * Order Total
             */
            const orderTotal =
                Number(
                    o.currentTotalPriceSet?.shopMoney?.amount || 0
                );

            /**
             * --------------------------------------------
             * Process Every Line Item
             * One Line Item = One ERP Record
             * --------------------------------------------
             */
            o.lineItems.edges.forEach(item => {

                const sku =
                    clean(item.node.sku);

                const qty =
                    Number(item.node.quantity || 0);

                const unitPrice =
                    Number(
                        item.node.originalUnitPriceSet.shopMoney.amount || 0
                    );

                /**
                 * Calculate Line Total
                 */
                const total =
                    qty * unitPrice;

                /**
                 * Build ERP Record
                 */
                rows.push([

                    // Order Information
                    orderNumber,
                    orderDate,

                    // Shipping Information
                    clean(ship.firstName) || "",
                    clean(ship.lastName) || "",
                    clean(ship.company) || "",
                    clean(ship.address1) || "",
                    clean(ship.address2) || "",
                    clean(ship.city) || "",
                    clean(ship.province) || "",
                    clean(ship.zip) || "",
                    clean(ship.phone) || "",

                    // Billing Information
                    clean(bill.firstName) || "",
                    clean(bill.lastName) || "",
                    clean(bill.company) || "",


                    // Billing Address
                    clean(bill.address1) || "",
                    clean(bill.address2) || "",
                    clean(bill.city) || "",
                    clean(bill.province) || "",
                    clean(bill.zip) || "",
                    clean(bill.phone) || "",

                    // Customer
                    customerNumber || "",
                    customerEmail || "",

                    // Product
                    sku || "",

                    // Quantity
                    qty || 0,

                    // Order Quantity
                    qty || 0,

                    // Unit Price
                    unitPrice.toFixed(2),

                    /**
                     * Oracle Values
                     * Currently blank
                     * ERP can populate these.
                     */
                    "",
                    "",

                    // Line Total
                    total.toFixed(2),

                    // Total Tax
                    totalTax.toFixed(2),

                    // Tax State
                    "",

                    // Shipping Cost
                    shippingCost.toFixed(2),

                    // Shipping Type
                    "",

                    // Order Total
                    orderTotal.toFixed(2),

                    // Notes
                    orderNotes || "",

                    // Specail order
                    ""

                ].join("|"));

            });

        });

        /**
         * --------------------------------------------
         * Write DAT File
         * --------------------------------------------
         */
        fs.writeFileSync(
            filePath,
            rows.join("\n"),
            "utf8"
        );

        console.log("================================");
        console.log("Order Export Completed");
        console.log(`Orders Exported : ${orders.length}`);
        console.log(`File Created : ${filePath}`);
        console.log("================================");

        return filePath;

    } catch (err) {

        console.error("================================");
        console.error("Order Export Failed");
        console.error(err.message);
        console.error("================================");

        return null;

    }

}

module.exports = {
    exportOrders
};