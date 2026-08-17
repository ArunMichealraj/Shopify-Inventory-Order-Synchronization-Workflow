require("dotenv").config();
const axios = require("axios");
const storage = require("./orderStorage");

const client = axios.create({
  baseURL: `https://${process.env.SHOP}/admin/api/2025-10/graphql.json`,
  headers: {
    "X-Shopify-Access-Token": process.env.ACCESS_TOKEN,
    "Content-Type": "application/json"
  }
});

/**
 * Get Shopify orders created after the last synced date
 */
async function getOrders() {

  try {

    // Read last synced order date
    const lastDate = storage.getLastOrderDate();

    let searchFilter = "";

    // Only fetch orders created after the last sync
    if (lastDate) {
      searchFilter = `query: "created_at:>'${lastDate}'"`;
    }

    const query = `
        {
          orders(
            first: 100,
            sortKey: CREATED_AT,
            reverse: false,
            ${searchFilter}
          ) {
            edges {
              node {
                id
                name
                createdAt
                note

                customer {
                  legacyResourceId
                  email
                }

                shippingAddress {
                  firstName
                  lastName
                  name
                  company
                  address1
                  address2
                  city
                  province
                  zip
                  countryCodeV2
                  phone
                }

                billingAddress {
                  firstName
                  lastName
                  company
                  address1
                  address2
                  city
                  province
                  zip
                  phone
                }

                shippingLine {
                  originalPriceSet {
                    shopMoney {
                      amount
                    }
                  }
                }

                currentTotalPriceSet {
                  shopMoney {
                    amount
                  }
                }

                currentTotalTaxSet {
                  shopMoney {
                    amount
                  }
                }

                lineItems(first:100) {
                  edges {
                    node {
                      sku
                      quantity

                      originalUnitPriceSet {
                        shopMoney {
                          amount
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }`;

    console.log("================================");
    console.log("Last Sync Date :", lastDate || "First Sync");
    console.log("================================");

    const response = await client.post("", { query });

    // GraphQL Errors
    if (response.data.errors) {

      console.log("================================");
      console.log("Shopify GraphQL Error");
      console.log(JSON.stringify(response.data.errors, null, 2));
      console.log("================================");

      return [];
    }

    let orders = response.data?.data?.orders?.edges || [];

    // No orders returned from Shopify
    if (orders.length === 0) {

      console.log("================================");
      console.log("No new orders found.");
      console.log("================================");

      return [];
    }

    // Extra filtering using last synced date
    if (lastDate) {

      const lastSync = new Date(lastDate);

      orders = orders.filter(order => {
        return new Date(order.node.createdAt) > lastSync;
      });

    }

    // No orders after filtering
    if (orders.length === 0) {

      console.log("================================");
      console.log(`No new orders found after ${lastDate}`);
      console.log("================================");

      return [];
    }

    // Debug - Display orders that will be exported
    console.log("================================");
    console.log(`Found ${orders.length} new order(s).`);
    console.log("================================");

    orders.forEach(order => {
      console.log(
        `${order.node.name} | ${order.node.createdAt}`
      );
    });

    return orders;

  } catch (err) {

    console.log("================================");
    console.log("Failed to fetch Shopify orders.");
    console.log(err.message);
    console.log("================================");

    return [];
  }
}

module.exports = {
  getOrders
};