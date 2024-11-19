'use strict';

/**
 * site-manager service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::site-manager.site-manager');
