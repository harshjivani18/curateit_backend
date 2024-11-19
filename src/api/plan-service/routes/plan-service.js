'use strict';

/**
 * plan-service router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::plan-service.plan-service');
