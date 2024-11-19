'use strict';

/**
 * screenshot service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::screenshot.screenshot', {

    createSreenshot: async (body, userId, collId) => {
        try {

            let tagIds = [];
            if (body.tags.length > 0) {
                body.tags.map(data => {
                    tagIds.push(data.id)
                });
            };

            const screenshot = await strapi.entityService.create('api::gem.gem', {
                data: {
                    title: body.title,
                    description: body.description,
                    media: body,
                    media_type: "Screenshot",
                    S3_link: [body.imageLink],
                    author: userId,
                    url: body.url,
                    tags: tagIds,
                    collection_gems: collId,
                    publishedAt: new Date().toISOString(),
                }
            });

            return screenshot;
        } catch (error) {
            console.log(error);
        }
    },

    getScreenshot: async (userId, url) => {
        try {

            let queryURL;
            url.map(data => queryURL = data.value.endsWith('/') ? data.value.slice(0, -1) : data.value);

            const screenshot = await strapi.entityService.findMany('api::gem.gem', {
                filters: {url: queryURL, author: userId, media_type: "Screenshot" }
            });

            return screenshot;
        } catch (error) {
            console.log(error);
        }
    },

    getScreenshotById: async (gemId) => {
        try {
            const screenshot = await strapi.entityService.findOne('api::gem.gem', gemId, {
                populate: '*'
            });

            return screenshot;
        } catch (error) {
            console.log(error);
        }
    },

    updateScreenshot: async (body, gemId) => {
        try {

            let tagIds = [];
            if (body.tags.length > 0) {
                body.tags.map(data => {
                    tagIds.push(data.id)
                });
            }

            const pdfOcrGem = await strapi.entityService.update('api::gem.gem', gemId, {
                data: {
                    media: body,
                    title: body.title,
                    description: body.description,
                    tags: tagIds,
                    collection_gems: body.collections
                }
            });

            return pdfOcrGem;
        } catch (error) {
            console.log(error);
        }
    },

    deleteScreenshot: async (gemId) => {
        try {
            const imageOcrGem = await strapi.entityService.delete('api::gem.gem', gemId);

            return imageOcrGem;
        } catch (error) {
            console.log(error);
        }
    },
});
