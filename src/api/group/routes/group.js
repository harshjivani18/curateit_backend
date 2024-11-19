'use strict';

/**
 * group router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::group.group', {
    config: {
        update: {
            middlewares: ["api::group.group-middleware"],
        },
    }
});
