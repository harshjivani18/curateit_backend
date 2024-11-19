"use strict";

const { Configuration, OpenAIApi } = require("openai");

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::gem.gem", ({ strapi }) => ({

    async smartGroupTabs(ctx) {
        // try {
            // const { user }              = ctx.state;
            const { links }             = ctx.request.body;
            
            const promptObj             = await strapi.db.query('api::internal-ai-prompt.internal-ai-prompt').findOne({
                where: { promptType: 'Group links prompt' }
            })

            if (!promptObj) {
                return ctx.send({
                    status: 400,
                    msg: 'Prompt not found',
                });
            } 

            const configuration         = new Configuration({
                apiKey: process.env.PROD_OPENAI_API_KEY,
            });
            const openai                = new OpenAIApi(configuration);
            const chatRes               = await openai.createChatCompletion({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: promptObj?.prompt?.replace("{links}", links.join(",")) }],
            }, { responseType: "json" })
            // console.log("Chat", chatRes?.data?.choices[0]?.message?.content)
            return ctx.send({
                status: 200,
                data: JSON.parse(chatRes?.data?.choices[0]?.message?.content)
            });
        // } catch (error) {
        //     return ctx.send({
        //         status: 400,
        //         msg: error?.response?.data?.error
        //     });
        // }
    },

    async createTabs(ctx) {
        const { data } = ctx.request.body
        const { user } = ctx.state

        if (data && user) {
            try {
                const promiseArr = data.map((gem) => {
                    return strapi.service("api::gem.tabs").createTabsPromise(gem, user)
                })
                const response = await Promise.all(promiseArr);
                createBulkElasticData(user.id, response, user.username)
                // updateScreenshotsData(user.id, response, user.username)
                return ctx.send({ data: response })
            }
            catch (err) {
                return ctx.send({ message: err })
            }
        }
        return ctx.send({ message: "Data or user not found" })
    }
}));
