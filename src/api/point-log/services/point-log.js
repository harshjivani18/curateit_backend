'use strict';

/**
 * point-log service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::point-log.point-log');
