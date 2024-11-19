'use strict';

/**
 * activity-log controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::activity-log.activity-log', ({ strapi }) => ({

    async find(ctx) {
        try {
            const { user }              = ctx.state;
            const { page, perPage }      = ctx.request.query;
            const pages                 = page ? page : 0;
            const perPages              = perPage ? perPage : 100;
            const pageNum               = parseInt(pages);
            const perPageNum            = parseInt(perPages);
            let payload                 = {};
            const [activity, totalCount]= await Promise.all([
                strapi.entityService.findMany("api::activity-log.activity-log", {
                    filters: { author: user.id },
                    sort: {id: "desc"},
                    populate: {
                        author: {
                            fields: ["id", "username"]
                        },
                        gem: {
                            fields: ["id", "title"]
                        },
                        collection: {
                            fields: ["id", "name"]
                        }
                    },
                    start: pageNum === 0 ? 0 : (pageNum - 1) * perPageNum,
                    limit: perPageNum
                }),
                strapi.entityService.count("api::activity-log.activity-log", {
                    filters: { author: user.id },
                }),
            ])

            payload.totalCount          = totalCount;
            payload.activities          = activity;

            ctx.send({
                status: 200,
                message: payload
            })
        } catch (error) {
            ctx.send({
                status: 400,
                message: error
            })
        }
    }
}));
