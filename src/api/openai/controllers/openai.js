'use strict';

/**
 * openai controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::openai.openai', ({ strapi }) => ({
    openai: async (ctx) => {
        try {
            const body = ctx.request.body;
            const query = ctx.request.query;

            const data = await strapi.service('api::openai.openai').openai(body, query);

            ctx.send({ status: 200, message: data });

        } catch (error) {
            ctx.send({ status: 400, message: error });
        }
    },

    sendAIResponse: async (ctx) => {
        try {
            const { user }      = ctx.state
            // const { prompt }    = ctx.request.body;
            const body          = ctx.request.body;
            const { platform }  = ctx.query;

            if (!user) {
                return ctx.send({ status: 401, message: 'Unauthorized' });
            }

            if (!body) {
                return ctx.send({ status: 400, message: 'Prompt is required' });
            }

            const data = await strapi.service('api::openai.openai').processAndSendAIResponse(body, platform, user);

            return ctx.send({ status: 200, data: data });

        } catch (error) {
            return ctx.send({ status: 400, message: error?.response?.data?.error || error });
        }
    },

    repharsePrompt: async (ctx) => {
        try {
            const { user }      = ctx.state
            const { prompt }    = ctx.request.body;

            if (!user) {
                return ctx.send({ status: 401, message: 'Unauthorized' });
            }

            if (!prompt) {
                return ctx.send({ status: 400, message: 'Prompt is required' });
            }

            const data = await strapi.service('api::openai.openai').repharsePrompt(prompt, user);

            return ctx.send({ status: 200, data: data });

        } catch (error) {
            return ctx.send({ status: 400, message: error?.response?.data?.error || error });
        }
    },

    textToSpeechWithOpenai: async (ctx) => {
        // try {
            const { user }      = ctx.state
            const { text,
                    voice,
                    isDemoLink
             }                  = ctx.request.body;

            if (!user) {
                return ctx.send({ status: 401, message: 'Unauthorized' });
            }

            if (!text) {
                return ctx.send({ status: 400, message: 'Text is required' });
            }

            const data = await strapi.service('api::openai.openai').textToSpeechWithOpenai(text, voice, isDemoLink, user);

            return ctx.send({ status: 200, data: data });

        // } catch (error) {
        //     return ctx.send({ status: 400, message: error?.response?.data?.error || error });
        // }
    }
}));
