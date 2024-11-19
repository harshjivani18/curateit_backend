'use strict';

/**
 * custom-field service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::custom-field.custom-field');
