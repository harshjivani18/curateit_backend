'use strict';

const { getFullScreenshot } = require('../../../../utils');

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController("api::gem.gem", ({ strapi }) => ({

    async importTweets(user, tweetBoomarks, collectionId, query) {
        if (tweetBoomarks && user) {
            const tweetArr = tweetBoomarks.map((t) => {
                return this.createTweetGem(t, user.id, collectionId, query)
            })
            const tweetRes = await Promise.all(tweetArr);
            return tweetRes;
        }
    },

    createTweetGem(tweet, userId, collectionId, query) {

        const formatMedia = (imageUrl) => {
            let cover = []
            imageUrl.map(i => {
                if (i.url) {
                    cover.push(i.url)
                }
            })
            return { covers: cover }
        }

        const imageObj = tweet.medias.length === 0 ? [] : formatMedia(tweet.medias)

        return new Promise((resolve, reject) => {
            strapi.db.query("api::gem.gem").findOne({
                where: { url: tweet.tweetUrl, author: userId }
            })
                .then((res) => {
                    if (res) {
                        strapi.entityService.update("api::gem.gem", res.id, {
                            data: {
                                title:  tweet.text ? tweet.text.slice(0, tweet.text.split(" ", 10).join(" ").length) : "No title",
                                media: imageObj,
                                metaData: imageObj,
                                media_type: query.media_type,
                                tweet_type: query.tweet_type,
                                tweet_obj: tweet,
                                collection_gems: collectionId,
                            }
                        })
                            .then((res) => {
                                resolve(res)
                            })
                    } else {
                        strapi.entityService.create("api::gem.gem", {
                            data: {
                                ...tweet,
                                author: userId,
                                title: tweet.text ? tweet.text.slice(0, tweet.text.split(" ", 10).join(" ").length) : "No title", 
                                media: imageObj,
                                metaData: imageObj,
                                media_type: query.media_type,
                                tweet_type: query.tweet_type,
                                tweet_obj: tweet,
                                url: tweet.tweetUrl,
                                collection_gems: collectionId,
                                tweetAt: tweet.date,
                                publishedAt: new Date().toISOString(),
                            }
                        })
                            .then((res) => {
                                // getFullScreenshot(res);
                                resolve(res)
                            })
                    }
                })

        })
    },
}))