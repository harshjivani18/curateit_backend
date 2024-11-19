'use strict';

/**
 * prompt-builder service
 */

const { createCoreService } = require('@strapi/strapi').factories;
const { parse } = require("tldts");

module.exports = createCoreService('api::prompt-builder.prompt-builder', ({strapi}) => ({
    createPromptGem: async (body, user) => {
        try {

            const domain = parse(body.url);

            const domainManager = await strapi.entityService.findMany('api::domain-manager.domain-manager', {
                filters: {domainName: domain.domain, DomainType: "Domain"}
            });

            const prompt = await strapi.entityService.create('api::prompt-builder.prompt-builder', {
                data: {
                    name: body.name,
                    prompt: body.prompt,
                    promptType: "Suggested",
                    user: user.id,
                    featured_sites: domainManager[0].id,
                    publishedAt: new Date().toISOString(),
                }
            });

            const promptId = prompt.id;

            const promptGem = await strapi.entityService.create('api::gem.gem', {
                data: {
                    title: body.name,
                    description: body.prompt,
                    text: body.prompt,
                    media_type: "Ai Prompts",
                    prompt: promptId,
                    author: user.id,
                    remarks: body.remarks,
                    url: body.url,
                    collection_gems: body.collection,
                    tags: body.tags,
                    publishedAt: new Date().toISOString(),
                }
            });

            return promptGem;
        } catch (error) {
            console.log(error);
        }
    }
}));
