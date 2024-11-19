const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::gem.gem", ({ strapi }) => ({
    async updateGemCommentCount(ctx) {
        try {
            const { gemId } = ctx.params;
            const { comments_count } = ctx.request.body;

            if (!comments_count) { return ctx.send({ status: 400, message: "Comments count is required" }); }
            await strapi.entityService.update("api::gem.gem", gemId, {
                data: {
                    comments_count
                }
            });

            return ctx.send({ status: 200, message: "Gem Comment Count updated" });
        } catch (error) {
            return ctx.send({ status: 400, message: error });
        }
    },

}));
