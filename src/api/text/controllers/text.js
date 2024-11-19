'use strict';

/**
 * text controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { convertRestQueryParams } = require('strapi-utils/lib');


module.exports = createCoreController('api::text.text', ({strapi}) => ({
    createText: async (ctx, next) => {
        try {
            const body = ctx.request.body;
            const data = await strapi.service("api::text.text").createText(body);
            
            ctx.send(data);
        } catch (error) {
            console.log("error", error);
        }
    },

    createHighlightedText: async (ctx, next) => {
        try {
         
            const userId = ctx.state.user.id;
            const body = ctx.request.body;
            const query = ctx.request.query;
            const params = ctx.params;
           
            const data = await strapi.service("api::text.text").createHighlightedText(body, params, userId, query);

            ctx.send(data);
        } catch (error) {
            ctx.send({status: 400, message: error});
        }
    },

    getHighlightedText: async (ctx, next) => {
        try {
            const filter = convertRestQueryParams(ctx.request.query);
            const userId = ctx.state.user.id;
            
            const data = await strapi.service("api::text.text").getHighlightedText(filter.where, userId);

            ctx.send(data);
        } catch (error) {
            ctx.send({status: 400, message: error});
        }
    },

    getHighlightedTextById: async (ctx, next) => {
        try {
         
            const params = ctx.params.gemId;
          
            const data = await strapi.service("api::text.text").getHighlightedTextById(params);

            ctx.send(data);
        } catch (error) {
            ctx.send({status: 400, message: error});
        }
    },

    updateHighlightedText: async (ctx, next) => {
        try {
            const userId = ctx.state.user.id;
            const body = ctx.request.body;
            const params = ctx.params.gemId;
          
            const data = await strapi.service("api::text.text").updateHighlightedText(body, params, userId);

            ctx.send(data);
        } catch (error) {
            ctx.send({status: 400, message: error});
        }
    },

    deleteHighlightedText: async (ctx, next) => {
        try {
            const params = ctx.params.gemId;
            const userId = ctx.state.user.id;
            await strapi.service("api::text.text").deleteHighlightedText(params,userId);

            ctx.send({ status: 200, message: "HighlighGem deleted" });
        } catch (error) {
            ctx.send({status: 400, message: error});
        }
    }

}));
