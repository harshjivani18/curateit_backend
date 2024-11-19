'use strict';

/**
 * prompt-response controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::prompt-response.prompt-response', ({strapi}) => ({
    createPromptRes: async (ctx, next) => {
        try {
            const body = ctx.request.body;
            const user = ctx.state.user;

            const data = await strapi.service('api::prompt-response.prompt-response').createPromptRes(body, user);

            ctx.send(data)
        } catch (error) {
            ctx.send({status: 400, message: error});
        }
    }
}));
