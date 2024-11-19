'use strict';

/**
 * plan-service service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::plan-service.plan-service');
