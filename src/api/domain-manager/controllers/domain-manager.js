'use strict';

/**
 * domain-manager controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::domain-manager.domain-manager', ({ strapi }) => ({
    getCountOfSaveGem: async (ctx) => {
        try {
            const {url} = ctx.request.query;
            const d = await strapi.db.query("api::domain-manager.domain-manager").findOne({
                where: {url},
                populate: {
                    gems: {
                        count: true
                    }
                }
            })
            return ctx.send({status: 200, saveCount: d.gems.count})
        } catch (error) {
            ctx.send({status: 400, message: error})
        }
    }
}));
