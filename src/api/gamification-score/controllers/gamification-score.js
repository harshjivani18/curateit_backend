'use strict';

/**
 * gamification-score controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { score_keys } = require("../../../../constant");
const { updateGemiScoreRecs } = require('../../../../utils');
const { updateGemScreenshotsData } = require('../../gem/services/after-operations');

module.exports = createCoreController('api::gamification-score.gamification-score', ({ strapi }) => ({

    async getGamificationScore(ctx) {
        try {
            const userId = ctx.state.user.id;

            /* Get Gemification records by userId */
            const gemiScore = await strapi.db.query('api::gamification-score.gamification-score').findOne({
                where: {
                    author: userId
                }
            })

            /* Assigning level on basis of totalScore(gems,colls,comments,reactions)  */
            let totalScore = 0;
            let level;
            for (const keys in gemiScore) {
                if (score_keys.includes(keys)) {
                    totalScore += parseInt(gemiScore[keys]);
                }
            }
            switch (true) {
                case totalScore < 25000:
                    level = "Rookie";
                    break;
                case totalScore < 100000:
                    level = "Aspiring Influencer";
                    break;
                case totalScore < 500000:
                    level = "Expert";
                    break;
                default:
                    level = "Legend";
            }

            gemiScore.level = level;
            gemiScore.totalScore = totalScore;

            ctx.send({ msg: 'Gamification data retrieved successfully', data: gemiScore })
        } catch (err) {
            console.log("error occured :", err)
        }
    },

    async leaderboardWidget(ctx) {
        try {
            const { country, page, perPage } = ctx.request.query;
            let filters = { totalScore: { $ne: null }, author: { isPublic: true, is_test_account: { $ne: true } } }
            if (country) {
                filters.author = { isPublic: true, country, is_test_account: { $ne: true } }
            }

            const pages = page ? page : 0;
            const perPages = perPage ? perPage : 100;
            const pageNum = parseInt(pages);
            const perPageNum = parseInt(perPages);

            const [gemiScore, totalCount] = await Promise.all([
                strapi.entityService.findMany("api::gamification-score.gamification-score", {
                    filters,
                    sort: { totalScore: "desc" },
                    fields: ["totalScore", "level"],
                    populate: {
                        author: {
                            fields: ["id", "username", "firstname", "lastname", "country", "isPublic", "profilePhoto"]
                        }
                    },
                    start: pageNum === 0 ? 0 : (pageNum - 1) * perPageNum,
                    limit: perPageNum
                }),
                strapi.entityService.count("api::gamification-score.gamification-score", {
                    filters,
                }),
            ])

            ctx.send({
                status: 200,
                totalCount: totalCount,
                message: gemiScore
            })
        } catch (error) {
            ctx.send({
                status: 400,
                message: error
            })
        }
    },

    async updateGamification(ctx) {
        try {
            const { user }      = ctx.state;
            const { module }    = ctx.request.query;
            let count;
            let activeKey       = "gems"

            if (module === 'collection') {
                count = await strapi.entityService.count("api::collection.collection", {
                    filters: { author: user.id }
                })
                activeKey = "colls"
            } else if (module === 'gem') {
                count = await strapi.entityService.count("api::gem.gem", {
                    filters: { author: user.id }
                })
                // updateGemScreenshotsData(user.id, user.username)
                activeKey = "gems"
            }

            const updatedGemiScore = await strapi.db.query('api::gamification-score.gamification-score').findOne({
                where: {
                    author: user.id
                }
            })
            let level;
            let totalScore = 0
            for (const keys in updatedGemiScore) {
                if (score_keys.includes(keys)) {
                    totalScore += (keys === activeKey) ? count : parseInt(updatedGemiScore[keys])
                }
            }
            switch (true) {
                case totalScore < 25000:
                    level = "Rookie";
                    break;
                case totalScore < 100000:
                    level = "Aspiring Influencer";
                    break;
                case totalScore < 500000:
                    level = "Expert";
                    break;
                default:
                    level = "Legend";
            }
            const updatedObj = {
                level,
                totalScore
            }
            if (module === "gem") {
                updatedObj["gems"] = count
                updatedObj["gems_point"] = count
            }
            else if (module === "collection") {
                updatedObj["colls"] = count
                updatedObj["colls_point"] = count
            }
            await updateGemiScoreRecs(user.id, updatedObj);

            ctx.send({ status: 200, message: "Gamification score updated" })

        } catch (error) {
            console.log("updateGamification error====>", error);
            ctx.send({ status: 400, error })
        }
    }

}));
