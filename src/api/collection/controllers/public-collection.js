'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::gem.gem', ({ strapi }) => ({

    async publicGemApproveReject(ctx) {
        try {
            const { gemId } = ctx.params;
            const { isApproved, isPending, processAt } = ctx.request.body;

            await strapi.entityService.update("api::gem.gem", gemId, {
                data: {
                    isApproved,
                    isPending,
                    processAt
                }
            })

            ctx.send({ status: 200, message: isApproved === true ? "Gem approved successfully" : "Gem rejected successfully" })

        }
        catch (e) {
            return ctx.send({ status: 400, message: e })
        }
    },

    async getPendingGems(ctx) {
        try {
            const { collectionId } = ctx.params;
            const { page, perPage } = ctx.request.query;
            const pages = page ? page : '';
            const perPages = perPage ? perPage : 20;
            const pageNum = parseInt(pages);
            const perPagesNum = parseInt(perPages);

            let collection = await strapi.entityService.findOne("api::collection.collection", collectionId, {
                populate: {
                    gems: {
                        sort: { id: "asc" },
                        fields: ["id", "url", "slug", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "socialfeedAt", "entityObj", "expander", "platform", "isRead", "comments_count", "shares_count", "likes_count", "save_count", "highlightId", "isApproved", "isPending"],
                        populate: {
                            author: {
                                fields: ["id", "username", "firstname"]
                            }
                        }
                    },
                    author: {
                        fields: ["id", "username"]
                    }
                }
            })


            let pendingGems = collection.gems.filter((data) => {
                if (data?.author?.id !== collection.author.id && data.isApproved === false && data.isPending === true) {
                    return data
                }
            })

            const totalCount = pendingGems.length;
            const totalPages = Math.ceil(parseInt(pendingGems.length) / perPagesNum);

            if (pageNum > totalPages) {
                pendingGems = [];
            } else {
                const start = pageNum === 0 ? 0 : (pageNum - 1) * perPagesNum;
                const limit = start + perPagesNum;

                const paginatedGems = pendingGems.slice(start, limit);
                pendingGems = paginatedGems;
            }

            ctx.send({ status: 200, totalCount, gems: pendingGems })

        }
        catch (e) {
            return ctx.send({ status: 400, message: e })
        }
    },

    async publicGemApproveRejectList(ctx) {
        try {
            const { collectionId } = ctx.params;
            const { gems, atLast, firstDate, lastDate, page, perPage } = ctx.request.query;
            const pages = page ? page : 0;
            const perPages = perPage ? perPage : 100;
            const pageNum = parseInt(pages);
            const perPagesNum = parseInt(perPages);
            let filters = {};
            if (gems === 'approved') {
                filters.isApproved = true
                filters.isPending = false
            }
            if (gems === 'rejected') {
                filters.isPending = false
                filters.isApproved = false
            }

            let todayDate = new Date();
            if (atLast === "lastweek") {
                // Find the current day of the week (0-indexed, where Sunday is 0 and Saturday is 6)
                const currentDayOfWeek = todayDate.getDay();

                // Calculate the difference between the current day and the first day of the week (assuming Sunday as the first day)
                const daysUntilStartOfWeek = (currentDayOfWeek - 0 + 7) % 7;

                // Set the current date to the last day of the previous week
                const lastWeekLastDate = new Date(todayDate);
                lastWeekLastDate.setDate(lastWeekLastDate.getDate() - daysUntilStartOfWeek);

                // Set the current date to the first day of the last week
                const lastWeekFirstDate = new Date(lastWeekLastDate);
                lastWeekFirstDate.setDate(lastWeekLastDate.getDate() - 6);
                filters.processAt = {
                    $gte: lastWeekFirstDate.toISOString().split('T')[0],
                    $lt: lastWeekLastDate.toISOString().split('T')[0]
                }
            }

            if (atLast === "thisweek") {
                // Find the current day of the week (0-indexed, where Sunday is 0 and Saturday is 6)
                const currentDayOfWeek = todayDate.getDay();

                // Calculate the difference between the current day and the first day of the week (assuming Sunday as the first day)
                const daysUntilStartOfWeek = (currentDayOfWeek - 0 + 7) % 7;

                // Set the current date to the first day of the week
                const thisWeekFirstDate = new Date(todayDate);
                thisWeekFirstDate.setDate(todayDate.getDate() - daysUntilStartOfWeek);

                // Set the current date to the last day of the week
                const thisWeekLastDate = new Date(todayDate);
                thisWeekLastDate.setDate(thisWeekFirstDate.getDate() + 6);
                filters.processAt = {
                    $gte: thisWeekFirstDate.toISOString().split('T')[0],
                    $lt: thisWeekLastDate.toISOString().split('T')[0]
                }
            }

            if (atLast === "lastmonth") {

                // Set the current date to the first day of the current month
                todayDate.setDate(1);

                // Set the current date to the last day of the previous month
                todayDate.setMonth(todayDate.getMonth() - 1);
                const lastMonthLastDate = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0);
                filters.processAt = {
                    $gte: todayDate.toISOString().split('T')[0],
                    $lt: lastMonthLastDate.toISOString().split('T')[0]
                }
            }

            if (atLast === "yesterday") {
                // Subtract one day from the current date
                const yesterday = new Date(todayDate);
                yesterday.setDate(todayDate.getDate() - 1);

                filters.processAt = {
                    $eq: yesterday.toISOString().split('T')[0],
                }
            }

            if (atLast === "today") {
                filters.processAt = {
                    $eq: todayDate.toISOString().split('T')[0],
                }
            }

            if (firstDate) {
                lastDate ? filters.processAt = {
                    $gte: firstDate,
                    $lt: lastDate,
                } : filters.processAt = {
                    $eq: firstDate,
                }
            }

            let collection = await strapi.entityService.findOne("api::collection.collection", collectionId, {
                populate: {
                    gems: {
                        filters,
                        sort: { id: 'asc' },
                        fields: ["id", "url", "slug", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "updatedAt", "post_type", "socialfeed_obj", "socialfeedAt", "entityObj", "expander", "platform", "isRead", "comments_count", "shares_count", "likes_count", "save_count", "highlightId", "isApproved", "isPending", "processAt"],
                        populate: {
                            author: {
                                fields: ["id", "username", "firstname"]
                            }
                        },
                    },
                    author: {
                        fields: ["id", "username", "firstname"]
                    }
                }
            })

            let approvedCollectionGems = collection.gems.filter((data) => {
                if (((data?.author?.id !== collection.author.id || !data?.author) && data.processAt)) {
                    return data
                }
            })

            const totalCount = approvedCollectionGems.length;
            const totalPages = Math.ceil(parseInt(approvedCollectionGems.length) / perPagesNum);

            if (pageNum > totalPages) {
                approvedCollectionGems = [];
            } else {
                const start = (pageNum - 1) * perPagesNum;
                const end = start + perPagesNum;
                const paginatedGems = approvedCollectionGems.slice(start, end);
                approvedCollectionGems = paginatedGems;
            }


            ctx.send({ status: 200, totalCount, data: approvedCollectionGems })

        }
        catch (e) {
            return ctx.send({ status: 400, message: e })
        }
    },

}))