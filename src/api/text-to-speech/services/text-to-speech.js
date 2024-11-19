'use strict';

/**
 * text-to-speech service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::text-to-speech.text-to-speech');
