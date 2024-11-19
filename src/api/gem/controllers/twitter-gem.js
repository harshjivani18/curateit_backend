'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::gem.gem', ({ strapi }) => ({

    importTweets: async (ctx) => {
        try {
            const { user } = ctx.state;
            const { tweetBoomarks } = ctx.request.body;
            const { collectionId } = ctx.params;
            const { query } = ctx.request;

            if (!user) {
                ctx.send({
                    message: "Unauthorized User!"
                })
                return
            }

            const data = await strapi.service('api::gem.twitter-gem').importTweets(user, tweetBoomarks, collectionId, query);

            ctx.send({
                status: 200, msg: data
            })
        } catch (error) {
            ctx.send({
                status: 400, message: error
            })
        }
    },

    async fetchLatestTweets(ctx) {
        try {
            const { tweet } = ctx.request.query;
            const { user } = ctx.state;

            const twitterBookmarks = await strapi.entityService.findMany("api::gem.gem", {
                filters: { tweet_type: tweet, author: user.id },
                sort: { tweetAt: 'desc' }
            })

            ctx.send({
                status: 200,
                msg: twitterBookmarks[0]
            })
        } catch (error) {
            ctx.send({
                status: 400,
                msg: error
            })
        }
    },

    async getTwitterGem(ctx) {
        try {
            const { gemId } = ctx.params;
    
            const twitterGem = await strapi.entityService.findOne("api::gem.gem", gemId, {
                fields: ["id", "tweet_obj", "tweet_type", "slug"]
            })

            ctx.send({
                status: 200,
                data: twitterGem
            })
        } catch (error) {
            ctx.send({
                status: 400,
                msg: error
            })
        }
    }

}));