'use strict';

/**
 * config-limit service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::config-limit.config-limit');
