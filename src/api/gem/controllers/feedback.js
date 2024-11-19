'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::gem.gem', ({strapi}) => ({

    async createFeedback(ctx) {
        try {
            const { user } = ctx.state;
            const data = ctx.request.body;

            if (!user) {
                return ctx.unauthorized("Unauthorized User!")
            }

            if (data?.url) {

                const existingFeedback = await strapi.db.query("api::gem.gem").findOne({
                    where: { url: data?.url}
                })

                if (existingFeedback) {

                    await strapi.entityService.create("api::gem.gem", {
                        data: {
                            title: data?.title,
                            description: data?.description,
                            author: user?.id,
                            // url: data?.url,
                            media_type: data?.media_type ? data?.media_type : "Feedback",
                            status: data?.status ? data?.status : "Open",
                            priority: data?.priority ? data?.priority : "Low",
                            type: data?.feedbackType ? data?.feedbackType : "Idea",
                            collection_gems: data?.collection,
                            tags: data?.tag,
                            s3Link: data?.s3Link ? data?.s3Link : null,
                            other_feedback: data?.other_feedback ? data?.other_feedback : null,
                            parent_gem_id: existingFeedback?.id,
                            publishedAt: new Date().toISOString()
                        }
                    })

                    return ctx.send({ status: 200, message: "Feedback created successfully!" })
                }
            }

            const parentFeedbackGem = await strapi.entityService.create("api::gem.gem", {
                data: {
                    title: `${data?.title} url`,
                    author: user?.id,
                    url: data?.url,
                    media_type: "Link",
                    collection_gems: data?.collection,
                    tags: data?.tag,
                    publishedAt: new Date().toISOString()
                }
            })

            await strapi.entityService.create("api::gem.gem", {
                data: {
                    title: data?.title,
                    description: data?.description,
                    author: user?.id,
                    // url: data?.url,
                    media_type: data?.media_type ? data?.media_type : "Feedback",
                    status: data?.status ? data?.status : "Open",
                    priority: data?.priority ? data?.priority : "Low",
                    type: data?.feedbackType ? data?.feedbackType : "Idea",
                    collection_gems: data?.collection,
                    tags: data?.tag,
                    s3Link: data?.s3Link ? data?.s3Link : null,
                    other_feedback: data?.other_feedback ? data?.other_feedback : null,
                    parent_gem_id: parentFeedbackGem?.id,
                    publishedAt: new Date().toISOString()
                }
            })

            return ctx.send({ status: 200, message: "Feedback created successfully!" })

        } catch (error) {
            return ctx.badRequest(error.message)
        }
    }
}))