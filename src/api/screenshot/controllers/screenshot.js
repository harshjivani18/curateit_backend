'use strict';

/**
 * screenshot controller
 */
const { convertRestQueryParams } = require('strapi-utils');
const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::screenshot.screenshot', {

    createSreenshot: async (ctx) => {
        try {
            const body = ctx.request.body;
            const userId = ctx.state.user.id;
            const collId = ctx.params.collectionId;
            
            const data = await strapi.service('api::screenshot.screenshot').createSreenshot(body, userId, collId);

            return data;
        } catch (error) {
            return { status: 400, message: error };
        }
    },

    getScreenshot: async (ctx) => {
        try {
            const userId = ctx.state.user.id;
            const filter = convertRestQueryParams(ctx.request.query);

            const data = await strapi.service('api::screenshot.screenshot').getScreenshot(userId, filter.where);

            ctx.send(data);
        } catch (error) {
            ctx.send({ status: 400, message: error });
        };
    },

    getScreenshotById: async (ctx) => {
        try {
            const gemId = ctx.params.gemId;

            const data = await strapi.service('api::screenshot.screenshot').getScreenshotById(gemId);

            ctx.send(data);
        } catch (error) {
            ctx.send({ status: 400, message: error });
        };
    },

    updateScreenshot: async (ctx) => {
        try {
   
          const body = ctx.request.body;
          const gemId = ctx.params.gemId;
    
          const data = await strapi.service('api::screenshot.screenshot').updateScreenshot(body, gemId);

          ctx.send(data);
        } catch (error) {
          ctx.send({ status: 400, message: error });
        };
      },

    deleteScreenshot: async (ctx) => {
        try {
            const gemId = ctx.params.gemId;

            const data = await strapi.service('api::screenshot.screenshot').deleteScreenshot(gemId);

            ctx.send({status: 200, message: "Data Deleted"});
        } catch (error) {
            ctx.send({ status: 400, message: error });
        };
    },
});
