'use strict';

/**
 * code controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { convertRestQueryParams } = require('strapi-utils/lib');

module.exports = createCoreController('api::code.code', ({ strapi }) => ({
    
    createCode: async (ctx, next) => {
        try {
            const body      = ctx.request.body;
            const { user }  = ctx.state
            // if (!user) {
            //     ctx.send("Unauthorized user")
            //     return
            // }

            const data = await strapi.service('api::code.code').createCode(body, user);
            
            ctx.send(data);
        } catch (error) {
            console.log("error", error);
        }
    },
    
    createHighlightedCode: async (ctx, next) => {
        try {
            const body = ctx.request.body;
            const userId = ctx.state.user.id;
            const params = ctx.params;

            const data = await strapi.service('api::code.code').createHighlightedCode(body, params, userId);

            ctx.send(data);
        } catch (error) {
            ctx.send({ status: 400, message: error });
        }
    },

    getHighlightCode: async (ctx, next) => {
        try {
            const filter = convertRestQueryParams(ctx.request.query);
            const userId = ctx.state.user.id;

            const data = await strapi.service('api::code.code').getHighlightCode(filter.where, userId);

            ctx.send(data);
        } catch (error) {
            ctx.send({ status: 400, message: error });
        }
    },

    getHighlightCodeById: async (ctx, next) => {
        try {
            const params = ctx.params.gemId;

            const data = await strapi.service('api::code.code').getHighlightCodeById(params);

            ctx.send(data);
        } catch (error) {
            ctx.send({ status: 400, message: error });
        }
    },

    updateHighlightCode: async (ctx, next) => {
        try {
            const {user}     = ctx.state;
            const body       = ctx.request.body;
            const params     = ctx.params.gemId;
            
            const data = await strapi.service("api::code.code").updateHighlightCode(body, params, user.id);

            ctx.send(data);
        } catch (error) {
            ctx.send({ status: 400, message: error });
        }
    },

    deleteHighlightCode: async (ctx, next) => {
        try {
            const {user}     = ctx.state;
            const params     = ctx.params.gemId;
            await strapi.service("api::code.code").deleteHighlightCode(params, user.id);

            ctx.send({ status: 200, message: "Code deleted" });
        } catch (error) {
            ctx.send({ status: 400, message: error });
        }
    }
}));
