'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
module.exports = createCoreController('api::collection.collection', ({ strapi }) => ({

    async updateCollectionCommentCount(ctx) {
        try {
            const { collectionId } = ctx.params;
            const  { comments_count } = ctx.request.body;

            if (!comments_count) { return ctx.send({ status: 400, message: "Comments count is required" }); }
            await strapi.entityService.update("api::collection.collection", collectionId, {
                data: {
                    comments_count
                }
            });

            return ctx.send({
                status: 200,
                message: "Comment count updated successfully"
            });
        } catch (error) {
            ctx.send({ status: 400, error: error.message });
        }
    }

}))