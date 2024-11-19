'use strict';
/**
 * gem controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::gem.gem', ({strapi}) => ({
    storeImageUsingURL: async (ctx) => {
        const { user }          = ctx.state;
        const {
            url,
            gemId
        }                       = ctx.request.body;
        
        if (!url || !gemId) {
            return ctx.badRequest('Invalid request');
        }

        const newURL            = await strapi.service('api::gem.update-save-img').updateSaveImg(url, gemId, user.id)
        return ctx.send({ url: newURL })
    }
}));
