'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::gem.gem', ({ strapi }) => ({

    async createCollectionFromAIPrompt(ctx) {
        try {
          const { user } = ctx.state;
          const { name } = ctx.request.body;
          const { id }   = user;
          const collection = await strapi.entityService.create("api::collection.collection", {
            data: {
              name,
              author: id
            }
          })
    
          return ctx.send({ status: 200, data: collection })
        }
        catch (e) {
          return ctx.send({ status: 400, message: e })
        }
      },
}))