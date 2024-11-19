'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::gem.gem', ({strapi}) => ({

    createKindleHighlight: async (ctx) => {
        try {
            const { user } = ctx.state;
            const { books, collection_gems, remarks, tags } = ctx.request.body;

            if (!user) {
                ctx.send({
                    message: "Unauthorized User!"
                })
                return
            }

            await strapi.service('api::gem.kindle-highlight').createKindleHighlight(user, books, collection_gems, remarks, tags);

            ctx.send({
                status: 200, message: "All kindle hightlight fetched successfully"
            })
        } catch (error) {
            ctx.send({
                message: error
            })
        }
    }
}));