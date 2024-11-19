'use strict';

const { createActivity } = require('../../../../utils');
const { getService } = require('../../../extensions/users-permissions/utils');

/**
 * prompt-builder controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::prompt-builder.prompt-builder', ({ strapi }) => ({
    createPromptGem: async (ctx, next) => {
        try {
            const body = ctx.request.body;
            const user = ctx.state.user;
            const data = await strapi.service('api::prompt-builder.prompt-builder').createPromptGem(body, user);

            ctx.send(data);
        } catch (error) {
            ctx.send({ status: 400, message: error });
        }
    },

    async getPublicPrompts(ctx) {
        try {
            const { user } = ctx.state;

            const prompts = await strapi.entityService.findMany('api::prompt-builder.prompt-builder', {
                populate: {
                    author: { fields: ["id"]}
                }
            })
            // , {
            //     filter: { author: user.id }
            // })

            const myPromptList = prompts.filter((d) => d.prompt_type === "User" && parseInt(d?.author?.id) === parseInt(user.id) && d.share_type === "Private")                
            const adminPromptList = prompts.filter((d) => d.prompt_type === "Admin" && d.share_type === "Public")

            // let popularPromptList = []
            // popularPromptList.push(publicPromptList)
            // popularPromptList.push(adminPromptList)
            // popularPromptList = popularPromptList.flat(Infinity)
            // popularPromptList = popularPromptList.filter((d) => d.total_count).sort((a, b) => b.total_count - a.total_count);

            let popularPromptList = [...myPromptList, ...adminPromptList]
                .filter((d) => d.total_count)
                .sort((a, b) => b.total_count - a.total_count);

            // const poppularPromptList = publicPromptList.sort((a, b) => b.count - a.count);

            const promptList = {
                myPromptList,
                adminPromptList,
                popularPromptList
            }

            ctx.send({ status: 200, data: promptList });

        } catch (error) {
            ctx.send({ status: 400, message: error.message });
        }
    },

    async selectPrompts(ctx) {
        try {
            const { promptId } = ctx.params;
            const { user } = ctx.state;
            const jwt = getService('jwt').issue({ id: user.id });

            const prompt = await strapi.entityService.findOne('api::prompt-builder.prompt-builder', promptId, {
                fields: ["id", "name", "prompt", "total_count"],
                populate: {
                    gem: { fields: ["id", "title"]}
                }
            })

            strapi.entityService.update('api::prompt-builder.prompt-builder', promptId, {
                data: {
                    total_count: parseInt(prompt.total_count) + 1
                }
            })

            const object = {
                action: "Get",
                module: "Prompts",
                actionType: "Prompts",
                prompt_info: {
                    id: promptId,
                    name: prompt.prompt
                },
                gems_info: [{
                    id: prompt.gem.id, name: prompt.gem.title
                }],
                author: {
                    id: user.id,
                    username: user.username
                }
            }
            createActivity(object, jwt);

            ctx.send({ status: 200, data: prompt });

        } catch (error) {
            ctx.send({ status: 400, message: error.message });
        }
    }
}));
