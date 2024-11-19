'use strict';

/**
 * pdf-to-text service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::pdf-to-text.pdf-to-text');
