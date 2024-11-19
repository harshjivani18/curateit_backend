'use strict';

/**
 * bookmark-config controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::gem.gem', ({ strapi }) => ({

    async getAllPublicPromptGems(ctx) {
        const prompts = await strapi.db.query('api::gem.gem').findMany({
            where: { 
                media_type: "Ai Prompt",
                isPublicPrompt: true
            }
        })

        return ctx.send({
            status: 200,
            data: prompts || []
        })
    }
}));
