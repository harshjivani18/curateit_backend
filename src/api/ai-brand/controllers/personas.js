'use strict';

const { Configuration, OpenAIApi } = require('openai');

/**
 * bookmark-config controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::ai-brand.ai-brand', ({ strapi }) => ({

    async getUserPersonas(ctx) {
        const userId            = ctx?.state?.user?.id;

        if (!userId) {
            return ctx.unauthorized('Unauthorized');
        }

        const personas = await strapi.db.query('api::ai-brand.ai-brand').findMany({
            where: { 
                $or: [
                    { author: userId, brand_type: "Persona" },
                    { author: null, brand_type: "Persona" }
                ]
            },
            populate: {
                author: {
                    fields: ['id', 'username', 'email', 'firstname', 'lastname', 'profilePhoto']
                }
            }
        })

        return ctx.send({
            status: 200,
            data: personas || []
        })
    },

    createPersona: async (ctx) => {
        const userId            = ctx?.state?.user?.id;
        const { user }          = ctx?.state;
        const { 
            name, 
            description
        }                       = ctx.request.body;
        
        if (!userId) {
            return ctx.unauthorized('Unauthorized');
        }

        const personaPrompt         = await strapi.db.query('api::internal-ai-prompt.internal-ai-prompt').findOne({
            where: {
                promptType: "Brand Persona Prompt"
            }
        })

        if (!personaPrompt) {
            return ctx.send({
                status: 400,
                msg: 'Prompt not found',
            });
        }

        const configuration         = new Configuration({
            apiKey: process.env.PROD_OPENAI_API_KEY,
        });
        const openai                = new OpenAIApi(configuration);
        const chatRes               = await openai.createChatCompletion({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: personaPrompt?.prompt?.replace("{persona_name}", name).replace("{persona_description}", description) }],
        })

        const content               = chatRes?.data?.choices[0]?.message?.content

        if (!content) {
            return ctx.send({
                status: 400,
                msg: 'Content not found',
            });
        }

        const obj                   = {
            name,
            description: content,
            author: userId,
            brand_type: "Persona"
        }
        const persona               = await strapi.db.query('api::ai-brand.ai-brand').create({
            data: obj,
            populate: {
                author: {
                    select: ['id', 'username', 'email', 'firstname', 'lastname', 'profilePhoto']
                }
            }
        })  

        // update user ai settings
        await strapi.db.query('plugin::users-permissions.user').update({
            where: { id: user.id },
            data: {
                ai_settings: {
                    ...user.ai_settings,
                    defaultBrandPersona: persona.id,
                    defaultBrandPersonaName: persona.name
                }
            }
        })
        
        return ctx.send({
            status: 200,
            data: persona
        });
    }
}));
