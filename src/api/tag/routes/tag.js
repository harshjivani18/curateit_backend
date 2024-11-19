'use strict';

/**
 * tag router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::tag.tag', ({
    config: {
        create: {
            middlewares: ["api::tag.plan-service", "api::tag.share-tags"],
        },
        findOne: {
            middlewares: ["api::tag.share-tags"]
        }
    },
}));
