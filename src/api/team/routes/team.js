'use strict';

/**
 * team router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::team.team', ({
    config: {
        create: {
            middlewares: ["api::team.plan-service"],
        },
        update: {
            middlewares: ["api::team.plan-service"],
        }
    },
}));
