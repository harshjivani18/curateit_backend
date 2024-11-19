'use strict';

/**
 * referral controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::referral.referral', ({ strapi }) => ({

    async updateUserReferral(ctx) {
        try {
            const users = await strapi.entityService.findMany('plugin::users-permissions.user', {
                fields: ["id", "username"]
            });

            for (const user of users) {
                const referrral = await strapi.db.query('api::referral.referral').findOne({ 
                    where: { author: user.id }
                });
                if (!referrral) {
                    await strapi.entityService.create("api::referral.referral", {
                        data: {
                            author: user.id,
                            ref_code: user.username,
                            ref_users: [],
                            publishedAt: new Date().toISOString(),
                            platform: "link"
                        }
                    })
                }
            }
            return "success"
        } catch (error) {
            return ctx.send({ status: 400, error: error.message })
        }
    }
}));
