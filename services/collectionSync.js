const shopify = require("./shopify");

// Sync Active products into Shop collection
async function syncShopCollection() {
  try {
    console.log("🔄 Syncing Shop Collection...");

    // ==========================
    // 1. Get Shop Collection
    // ==========================
    const collectionResponse = await shopify.graphql(`
      query {
        collections(first: 1, query: "handle:shop") {
          nodes {
            id
            title
          }
        }
      }
    `);

    const collection =
      collectionResponse.data.collections.nodes[0];

    if (!collection) {
      console.log("❌ Shop collection not found.");
      return;
    }

    const collectionId = collection.id;

    console.log("Collection:", collection.title);

    // ==========================
    // 2. Get Products
    // ==========================
    const productResponse = await shopify.graphql(`
      query {
        products(first: 350) {
          nodes {
            id
            title
            metafield(namespace: "product_info", key: "ecommerce") {
              value
            }
          }
        }
      }
    `);

    const products = productResponse.data.products.nodes;

    const activeProducts = [];
    const inactiveProducts = [];

    products.forEach(product => {

      const ecommerce = product.metafield?.value;

      if (ecommerce === "Active") {
        activeProducts.push(product.id);
      } else {
        inactiveProducts.push(product.id);
      }

    });

    console.log("Active:", activeProducts.length);
    console.log("Inactive:", inactiveProducts.length);

    // ==========================
    // 3. Add Active Products
    // ==========================
    if (activeProducts.length) {

      await shopify.graphql(`
        mutation collectionAddProducts($id: ID!, $productIds: [ID!]!) {
          collectionAddProducts(
            id: $id,
            productIds: $productIds
          ) {
            userErrors {
              message
            }
          }
        }
      `,{
        id: collectionId,
        productIds: activeProducts
      });

      console.log("✅ Active products added.");
    }


    console.log("🎉 Shop Collection Synced");

  } catch (err) {
    console.error(err);
  }
}

// module.exports = {
//   syncShopCollection
// };

syncShopCollection()