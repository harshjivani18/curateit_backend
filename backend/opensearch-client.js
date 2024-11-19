// backend/opensearch-client.js
require("dotenv").config();

const { Client } = require("@opensearch-project/opensearch");

const { OPENSEARCH_DOMAIN_URL,
        OPENSEARCH_USERNAME,
        OPENSEARCH_PASSWORD }   = process.env
const opensearchClient          = new Client({
    auth: {
        username: OPENSEARCH_USERNAME,
        password: OPENSEARCH_PASSWORD
    },
    node: OPENSEARCH_DOMAIN_URL // OpenSearch domain URL
});

module.exports = opensearchClient;