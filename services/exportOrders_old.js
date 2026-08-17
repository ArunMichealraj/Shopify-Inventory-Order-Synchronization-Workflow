const fs = require("fs");
const path = require("path");

/**
 * ---------------------------------------------------------
 * Export Shopify Orders to ERP DAT Format
 * ---------------------------------------------------------
 *
 * Record Types
 * H = Header
 * L = Line Item
 * T = Trailer
 *
 * Output Format:
 * H|...
 * L|...
 * T|...
 *
 * @param {Array} orders Shopify GraphQL orders
 * @returns {string|null} Exported file path or null if failed
 * ---------------------------------------------------------
 */
function exportOrders(orders) {

    try {

        // Create export folder if it doesn't exist
        const folder = path.join(__dirname, "../export");

        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }

        // Generate file name
        const now = new Date();

        const fileName =
            `SHOPIFY_ORDERS_${
                now.getFullYear()
            }${
                String(now.getMonth() + 1).padStart(2, "0")
            }${
                String(now.getDate()).padStart(2, "0")
            }${
                String(now.getHours()).padStart(2, "0")
            }${
                String(now.getMinutes()).padStart(2, "0")
            }.dat`;

        const filePath = path.join(folder, fileName);

        const rows = [];

        /**
         * Remove pipes and line breaks
         */
        const clean = (value = "") =>
            String(value)
                .replace(/\|/g, " ")
                .replace(/\r?\n/g, " ")
                .trim();

        // Process every order
        orders.forEach(order => {

            const o = order.node;

            const orderNumber = clean(o.name.replace("#", ""));
            const orderDate = clean(o.createdAt.substring(0, 10));

            const customerNumber =
                clean(o.customer?.legacyResourceId);

            const customerEmail =
                clean(o.customer?.email);

            const ship = o.shippingAddress || {};

            const orderNotes = clean(o.note);

            // -------------------------
            // Header Record
            // -------------------------

            rows.push([
                "H",
                orderNumber,
                orderDate,
                customerNumber,
                customerEmail,
                clean(ship.name),
                clean(ship.company),
                clean(ship.address1),
                clean(ship.address2),
                clean(ship.city),
                clean(ship.province),
                clean(ship.zip),
                clean(ship.countryCodeV2),
                clean(ship.phone),
                orderNotes
            ].join("|"));

            // -------------------------
            // Line Records
            // -------------------------

            let lineNumber = 1;
            let orderTotal = 0;

            o.lineItems.edges.forEach(item => {

                const sku = clean(item.node.sku);

                const qty =
                    Number(item.node.quantity || 0);

                const unitPrice =
                    Number(
                        item.node.originalUnitPriceSet.shopMoney.amount || 0
                    );

                orderTotal += qty * unitPrice;

                rows.push([
                    "L",
                    orderNumber,
                    lineNumber++,
                    sku,
                    qty,
                    unitPrice.toFixed(2)
                ].join("|"));

            });

            // -------------------------
            // Trailer Record
            // -------------------------

            rows.push([
                "T",
                orderNumber,
                lineNumber - 1,
                orderTotal.toFixed(2)
            ].join("|"));

        });

        // Write file
        fs.writeFileSync(
            filePath,
            rows.join("\n"),
            "utf8"
        );

        console.log("================================");
        console.log("Order Export Completed");
        console.log(`Orders Exported : ${orders.length}`);
        console.log(`File : ${filePath}`);
        console.log("================================");

        return filePath;

    } catch (err) {

        console.error("Order Export Failed");
        console.error(err.message);

        return null;

    }

}

module.exports = {
    exportOrders
};