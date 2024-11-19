'use strict';

/**
 * ocr service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::ocr.ocr');
