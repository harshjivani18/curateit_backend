'use strict';

/**
 * domain-manager router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::domain-manager.domain-manager');
