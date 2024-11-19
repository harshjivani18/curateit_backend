"use strict";

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::gem.gem", ({ strapi }) => ({
    importSocialfeedPost: async (ctx) => {
        try {

            const { user } = ctx.state;
            const { data } = ctx.request.body;
            const { isProfile } = ctx.request.query;

            if (!user) {
                ctx.send({
                    message: "Unauthorized User!",
                });
                return;
            }

            await strapi
                .service("api::gem.socialfeed")
                .importSocialfeedPost(user, data, user.unfiltered_collection, isProfile);

            ctx.send({
                status: 200,
                msg: "SocialFeed Gem Created",
            });
        } catch (error) {
            ctx.send({
                status: 400, message: error
            })
        }
    },

    async getSocialfeedGem(ctx) {
        try {

            const { user } = ctx.state;
            const { posttype, type, platform, isLatest } = ctx.request.query;

            let sort = { id: "desc" };
            if (platform === "Twitter") sort = { socialfeedAt: "desc" };

            const socialfeedGem = await strapi.entityService.findMany(
                "api::gem.gem",
                {
                    filters: {
                        media_type: type,
                        post_type: posttype,
                        platform: platform,
                        author: user.id,
                    },
                    fields: ["id", "socialfeed_obj", "post_type", "slug"],
                    sort
                }
            );

            ctx.send({
                status: 200,
                data: isLatest ? socialfeedGem[0] : socialfeedGem,
            });
        } catch (error) {
            ctx.send({
                status: 400,
                msg: error,
            });
        }
    },
}));
