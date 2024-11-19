'use strict';

/**
 * domain-manager service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::domain-manager.domain-manager');
