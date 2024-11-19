'use strict';

/**
 * gem router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::gem.gem', {
    config: {
        find: {
            middlewares: ["api::gem.gems-operation"],
        },
        findOne: {
            middlewares: ["api::gem.gems-operation"],
        },
        create: {
            middlewares: ["api::gem.gems-operation", "api::gem.plan-service"],
        },
        update: {
            middlewares: ["api::gem.gems-operation"],
        },
        delete: {
            middlewares: ["api::gem.gems-operation"],
        },
    }
});
