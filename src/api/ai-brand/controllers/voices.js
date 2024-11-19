'use strict';

const { Configuration, OpenAIApi } = require('openai');

/**
 * bookmark-config controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::ai-brand.ai-brand', ({ strapi }) => ({

    async getUserVoices(ctx) {
        const userId            = ctx?.state?.user?.id;

        if (!userId) {
            return ctx.unauthorized('Unauthorized');
        }

        const voices = await strapi.db.query('api::ai-brand.ai-brand').findMany({
            where: { 
                $or: [
                    { author: userId, brand_type: "Voice" },
                    { author: null, brand_type: "Voice" }
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
            data: voices || []
        })
    },

    createVoice: async (ctx) => {
        const userId            = ctx?.state?.user?.id;
        const { user }          = ctx?.state;
        const { 
            name, 
            description
        }                       = ctx.request.body;
        
        if (!userId) {
            return ctx.unauthorized('Unauthorized');
        }

        const voicePrompt       = await strapi.db.query('api::internal-ai-prompt.internal-ai-prompt').findOne({
            where: {
                promptType: "Brand Voice Prompt"
            }
        })

        if (!voicePrompt) {
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
            messages: [{ role: "user", content: voicePrompt?.prompt?.replace("{voice_name}", name).replace("{voice_description}", description) }],
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
            brand_type: "Voice"
        }
        const voice                 = await strapi.db.query('api::ai-brand.ai-brand').create({
            data: obj,
            populate: {
                author: {
                    select: ['id', 'username', 'email', 'firstname', 'lastname', 'profilePhoto']
                }
            }
        }) 
        
        await strapi.db.query('plugin::users-permissions.user').update({
            where: { id: user.id },
            data: {
                ai_settings: {
                    ...user.ai_settings,
                    defaultBrandVoiceId: voice.id,
                    defaultBrandVoiceName: voice.name
                }
            }
        })

        return ctx.send({
            status: 200,
            data: voice
        });
    }
}));
