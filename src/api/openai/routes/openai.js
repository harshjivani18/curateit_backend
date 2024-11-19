'use strict';

/**
 * openai router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::openai.openai');
