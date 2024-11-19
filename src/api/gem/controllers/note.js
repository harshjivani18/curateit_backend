'use strict';

const { convertRestQueryParams } = require('strapi-utils/lib');

/**
 * gem controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { fetchAudioFileData, fetchGPTResponse } = require("../../../../utils");

module.exports = createCoreController('api::gem.gem', ({ strapi }) => ({

    async noteEnhancedText(ctx) {
        // try {
            const { files } = ctx.request;

            const originalText = await fetchAudioFileData(files.files);

            const enhancedText = await fetchGPTResponse(originalText);

            const obj = {
                originalText,
                enhancedText
            }
            ctx.send({ status: 200, data: obj })

        // } catch (error) {
        //     ctx.send({ status: 400, message: error.message })
        // }
    }

}));
