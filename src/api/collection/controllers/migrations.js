'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::collection.collection', ({ strapi }) => ({

    async migrateSiteConfig(ctx) {
        try {
            await strapi.db.query("api::collection.collection").updateMany({
                data: {
                    siteConfig: {
                        headerType : 'default',
                        headerPosition: 'center',
                        isHeaderSticky: true,
                        pagesItems: []
                    }
                }
            })

            return ctx.send("Collection site config migrated successfully")
        } catch (error) {
            return ctx.send({ status: 400, error: error.message })
        }
    }

}))