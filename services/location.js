require("dotenv").config();
const axios = require("axios");

/**
 * Retrieves all Shopify Locations.
 *
 * Used once to obtain the Location ID
 * required for inventory updates.
 **/
async function getLocations() {
  const query = `
  {
    locations(first: 10) {
      edges {
        node {
          id
          name
        }
      }
    }
  }`;

  const response = await axios.post(
    `https://${process.env.SHOP}/admin/api/2025-10/graphql.json`,
    { query },
    {
      headers: {
        "X-Shopify-Access-Token": process.env.ACCESS_TOKEN,
        "Content-Type": "application/json",
      },
    }
  );

  console.log(JSON.stringify(response.data, null, 2));
}

getLocations();