'use strict';

/**
 * collection router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

// module.exports = createCoreRouter('api::collection.collection');

module.exports = createCoreRouter("api::collection.collection", {
    config: {
        find: {
            middlewares: ["api::collection.share-collection"],
        },
        findOne: {
            middlewares: ["api::collection.share-collection"],
        },
        create: {
            middlewares: ["api::collection.share-collection", "api::collection.plan-service"],
        },
        update: {
            middlewares: ["api::collection.share-collection"],
        },
        delete: {
            middlewares: ["api::collection.share-collection"],
        },
    },
});
