'use strict';

/**
 * internal-ai-prompt service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::internal-ai-prompt.internal-ai-prompt');
