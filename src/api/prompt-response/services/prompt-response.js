'use strict';

/**
 * prompt-response service
 */

const { createCoreService } = require('@strapi/strapi').factories;
const { Configuration, OpenAIApi } = require("openai");
const { parse } = require("tldts");

module.exports = createCoreService('api::prompt-response.prompt-response', ({ strapi }) => ({
    createPromptRes: async (body, user) => {
        try {
            const configuration = new Configuration({
                apiKey: process.env.PROD_OPENAI_API_KEY,
            });

            const openai = new OpenAIApi(configuration);

            const response = await openai.createCompletion({
                model: "gpt-3.5-turbo-instruct",
                prompt: `${body.prompt} \n\n\n${body.selectedText} \n\n\n`,
                temperature: 0.7,
                max_tokens: 256,
                top_p: 1,
                frequency_penalty: 0,   
                presence_penalty: 0
            });

            const domain = parse(body.url);

            const domainManager = await strapi.entityService.findMany('api::domain-manager.domain-manager', {
                filters: {domainName: domain.domain, DomainType: "Domain"}
            });

            const promptResponse = await strapi.entityService.create('api::prompt-response.prompt-response', {
                data: {
                    prompt: body.prompt,
                    selectedText: body.selectedText,
                    response: response.data.choices[0].text,
                    user: user.id,
                    featured_sites: domainManager[0].id,
                    publishedAt: new Date().toISOString(),
                }
            });

            const promptResponseId = promptResponse.id;

            const promptResponseGem = await strapi.entityService.create('api::gem.gem', {
                data: {
                    title: body.prompt,
                    description: response.data.choices[0].text,
                    text: response.data.choices[0].text,
                    author: user.id,
                    prompt_response: promptResponseId,
                    media_type: "Notes",
                    url: body.url,
                    publishedAt: new Date().toISOString(),
                }
            });

            return promptResponseGem;

        } catch (error) {
            console.log(error);
        }
    }
}));
