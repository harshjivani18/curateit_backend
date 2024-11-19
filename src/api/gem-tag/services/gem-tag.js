'use strict';

/**
 * gem-tag service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::gem-tag.gem-tag');
