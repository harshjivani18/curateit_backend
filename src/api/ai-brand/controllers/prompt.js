'use strict';

/**
 * bookmark-config controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::ai-brand.ai-brand', ({ strapi }) => ({

    async getAllPublicPrompts(ctx) {
        const prompts = await strapi.db.query('api::ai-brand.ai-brand').findMany({
            where: { 
                brand_type: "Prompt",
                author: null
            }
        })

        return ctx.send({
            status: 200,
            data: prompts || []
        })
    }
}));
