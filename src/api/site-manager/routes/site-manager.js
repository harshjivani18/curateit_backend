'use strict';

/**
 * site-manager router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::site-manager.site-manager');
