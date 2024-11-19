'use strict';

const { getFullScreenshot } = require('../../../../utils');

/**
 * text service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::text.text', ({ strapi }) => ({

    createText: async (body) => {

        let textArr = [];
        body.highlightedData?.map(data => {
            textArr.push(data.highlightedText);
        });

        let textData = textArr.toString();

        const text = await strapi.service("api::gem.gem").create({
            data: {
                title: body.title,
                description: body.description,
                media: body,
                media_type: "Text Expander",
                text: textData,
                remarks: body.remarks
            }
        });
        // getFullScreenshot(text);
        return text;
    },

    createHighlightedText: async (body, params, userId, query) => {

        try {
            const newB = { ...body }
            const obj = {
                media_type: body.type || "Highlight",
                url: body.link || body.url,
                title: body.title,
                description: body.description,
                expander: body.expander === "" ? [] : body.expander,
                author: userId,
                tags: body.tags,
                metaData: body.metaData || null,
                remarks: body.notes,
                showThumbnail: body.showThumbnail !== undefined ? body.showThumbnail : true,
                is_favourite: body.is_favourite,
                collection_gems: params.collectionId,
                publishedAt: new Date().toISOString(),
                fileType: body.fileType || null,
                isPublicPrompt: body?.isPublicPrompt ? body?.isPublicPrompt : "false",
                is_enable_for_all_sites: body?.is_enable_for_all_sites || true,
                prompt_priority_sites: body?.prompt_priority_sites || null,
                prompt_category: body?.prompt_category || null,
            }

            let url = body.link || body.url;
            let gem = null
            const existingTypes = ["Note", "Quote", "Ai Prompt", "Text Expander"]
            if (existingTypes.indexOf(body.type) === -1) {
                gem = await strapi.db.query("api::gem.gem").findOne({
                    where: { url: url, collection_gems: params.collectionId }
                })
                if (!gem) {
                    const parentObj = {
                        media_type: query?.parent_type ? query?.parent_type : "Link",
                        url: body.link || body.url,
                        title: body.title,
                        description: body.description,
                        expander: body.expander === "" ? [] : body.expander,
                        author: userId,
                        tags: body.tags,
                        fileType: query?.parent_type ? "url" : null,
                        remarks: body.notes,
                        metaData: body.metaData || null,
                        is_favourite: body.is_favourite,
                        collection_gems: params.collectionId,
                        publishedAt: new Date().toISOString(),
                        isPublicPrompt: body?.isPublicPrompt ? body?.isPublicPrompt : "false"
                    }
                    if (query?.parent_type) {
                        parentObj["media"] = { mediaEndpoint: body.link || body.url }
                    }
                    gem = await strapi.db.query("api::gem.gem").create({
                        data: parentObj
                    })
                    // getFullScreenshot(gem);
                }
            }

            if (newB && newB.metaData) {
                delete newB.metaData
                delete newB.title
                delete newB.description
                delete newB.is_favourite
                obj["media"] = newB
            }
            else {
                obj["media"] = newB
            }

            obj["parent_gem_id"] = gem?.id || null

            const highlightedText = await strapi.entityService.create("api::gem.gem", {
                data: obj,
                populate: { parent_gem_id: { fields: ["id"]}}
            });
            // getFullScreenshot(highlightedText);

            return highlightedText;
        } catch (error) {
            console.log("error", error);
        }
    },

    getHighlightedText: async (params, userId) => {

        try {
            let queryURL;
            params.map(data => {
                queryURL = data.value.endsWith('/') ? data.value.slice(0, -1) : data.value;
            });

            const highlightData = await strapi.entityService.findMany("api::gem.gem", {
                populate: "*",
                filters: { url: queryURL, media_type: { $in: ["Highlight", "Ai Prompt", "Quote", "Note", "Text Expander"] }, author: userId }
            });

            let result = highlightData.map(({ id, media, slug, title, url, prompt_priority_sites, is_enable_for_all_sites, prompt_category }) => ({ id, media, slug, title, url, is_enable_for_all_sites, prompt_priority_sites, prompt_category })).flat(Infinity);

            return result;

        } catch (error) {
            return error;
        }

    },

    getHighlightedTextById: async (gemId) => {

        try {
            const imageOcrGem = await strapi.entityService.findOne('api::gem.gem', gemId, {
                populate: '*'
            });

            return imageOcrGem;

        } catch (error) {
            console.log("error", error);
            return error
        }
    },

    updateHighlightedText: async (body, gemId, userId) => {

        try {
            const obj = {
                media_type: body.type || "Highlight",
                url: body.link || body.url,
                title: body.title,
                description: body.description,
                expander: body.expander === "" ? [] : body.expander,
                author: userId,
                tags: body.tags,
                metaData: body.metaData || null,
                remarks: body.notes,
                is_favourite: body.is_favourite,
                collection_gems: body.collections,
                publishedAt: new Date().toISOString(),
                isPublicPrompt: body?.isPublicPrompt ? body?.isPublicPrompt : "false",
                is_enable_for_all_sites: body?.is_enable_for_all_sites || true,
                prompt_priority_sites: body?.prompt_priority_sites || null,
                prompt_category: body?.prompt_category || null,
            }
            if (body && body.metaData) {
                delete body.metaData
                delete body.title
                delete body.description
                delete body.is_favourite
                obj["media"] = body
            }
            else {
                obj["media"] = body
            }

            const highlightedText = await strapi.entityService.update('api::gem.gem', gemId, {
                data: obj
            });


            return highlightedText;

        } catch (error) {
            console.log("error", error);
        }
    },

    deleteHighlightedText: async (gemId, userId) => {

        try {

            const highlightedText = await strapi.entityService.delete('api::gem.gem', gemId);


            return highlightedText;

        } catch (error) {
            console.log("error", error);
        }
    },

}));
