'use strict';

/**
 * super-admin-configuration controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::super-admin-configuration.super-admin-configuration', ({ strapi }) => ({
    async getAllPublicUsers(ctx) {
        try {
            const { page, perPage } = ctx.request.query;
            const pages             = page ? parseInt(page) : 0;
            const perPages          = perPage ? parseInt(perPage) : 10;
            const users = await strapi.entityService.findMany('plugin::users-permissions.user', { 
                filters: { isPublic: true },
                fields: ["id", "username", "email", "createdAt", "updatedAt", "isPublic"],
                start: pages === 0 ? 0 : (pages - 1) * perPages,
                limit: perPages 
            });
            return ctx.send({ status: 200, data: users })
        }
        catch(e) {
            return ctx.send({ status: 400, message: e })
        }
    }
}));
