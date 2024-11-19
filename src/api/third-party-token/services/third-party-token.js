'use strict';

/**
 * third-party-token service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::third-party-token.third-party-token');
