'use strict';

/**
 * group controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::group.group', ({ strapi }) => ({

    async find(ctx) {
        try {
            const { id, user, email } = ctx.state.user;

            const groups = await strapi.entityService.findMany("api::group.group", {
                filters: { 
                    members: {
                        $containsi: email
                    }
                }
            })

            ctx.send({ status: 200, data: groups });

        } catch (e) {
            ctx.send({ status: 404, message: e.message });
        }
    }
}));
