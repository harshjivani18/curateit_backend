'use strict';

/**
 * config-limit controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::config-limit.config-limit', ({ strapi }) => ({
    async migrateRecords(ctx) {
        await strapi.db.query("api::config-limit.config-limit").updateMany({
            data: { is_advanced_search: false }
        })
        return ctx.send("All records updated!")
    },
    async getConfigLimit (ctx) {
        try {

            const configLimit = await strapi.db.query("api::config-limit.config-limit").findOne({
                where: { aiPromptLibraryId: { $notNull: true}, textExpanderId: { $notNull: true}, curateitDefaultId: { $notNull: true}, username: { $notNull: true} }
            })

            return ctx.send({ status: 200, data: configLimit })
        } catch (error) {
            return ctx.send({ status: 400, error: error.message})
        }
    }
}));
