'use strict';

const { filterBy } = require('../../../../utils');

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::collection.collection', ({ strapi }) => ({

    async groupByCollectionAndTag(gems) {
        const result = {};

        gems.forEach((gem) => {
            const collectionName = gem.collection_gems.name;

            if (gem.tags.length === 0) {
                const tagName = "No-tag";
                if (!result[collectionName]) {
                    result[collectionName] = {};
                }

                if (!result[collectionName][tagName]) {
                    result[collectionName][tagName] = [];
                }

                result[collectionName][tagName].push(gem);
            } else {
                gem.tags.forEach((tag) => {
                    const tagName = tag.tag;
                    if (!result[collectionName]) {
                        result[collectionName] = {};
                    }

                    if (!result[collectionName][tagName]) {
                        result[collectionName][tagName] = [];
                    }

                    result[collectionName][tagName].push(gem);
                });
            }
        });

        return result;
    },

    async objectToArrayFormat(obj) {
        const resultArray = [];

        for (const collName in obj) {
            for (const tagName in obj[collName]) {
                resultArray.push({
                    collName,
                    tagName,
                    gems: obj[collName][tagName],
                });
            }
        }

        return resultArray;
    },

    async filterBookmarkByCollTag(ctx) {
        try {
            const { pageno, perPage } = ctx.request.query;
            const pages = pageno ? pageno : 1;
            const perPages = perPage ? perPage : 10;
            const pageNum = parseInt(pages);
            const perPagesNum = parseInt(perPages);
            const { user } = ctx.state;
            const { groupBy, subGroupBy, page, is_favourite, collectionId, tagId, profileUser } = ctx.request.query;

            let where = {author: profileUser ? parseInt(profileUser) : user.id}
            if (page) where.media_type = page
            if (is_favourite) where.is_favourite = is_favourite;
            if (collectionId) where.collection_gems = parseInt(collectionId);
            if (tagId) where.tags = parseInt(tagId);

            const gems = await strapi.db.query("api::gem.gem").findMany({
                where,
                select: ["id", "url", "slug", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "socialfeedAt", "expander", "platform", "isRead", "comments_count", "shares_count", "likes_count", "save_count"],
                populate: {
                    collection_gems: {
                        select: ["id", "name", "slug", "comments_count", "shares_count", "likes_count", "save_count"]
                    },
                    tags: {
                        select: ["id", "tag", "slug"]
                    }
                }
            })

            if (groupBy && subGroupBy) {

                const groupByData = await this.groupByCollectionAndTag(gems)
                const finalResult = await this.objectToArrayFormat(groupByData)
                const totalCount = finalResult.length;
                const totalPages = Math.ceil(parseInt(finalResult.length) / perPagesNum);
                let paginateResult;
                if (pageNum > totalPages) {
                    paginateResult = [];
                } 
                else {
                    const start = (pageNum - 1) * perPagesNum;
                    const end = start + perPagesNum;
                    paginateResult = finalResult.slice(start, end);
                }
                ctx.send({totalCount, paginateResult})
            }
            else if (groupBy === "collection") {
                let grpByCollection = gems.reduce((result, item) => {
                    const existingCollection = result.find(
                        (gemsColl) => gemsColl.collName === item.collection_gems.name
                    );

                    if (existingCollection) {
                        existingCollection.gems.push(item);
                    } else {
                        result.push({
                            collName: item.collection_gems.name,
                            gems: [item],
                        });
                    }

                    return result;
                }, []);
                const totalCount = grpByCollection.length;
                const totalPages = Math.ceil(parseInt(grpByCollection.length) / perPagesNum);
                let paginatedColl;
                if (pageNum > totalPages) {
                    paginatedColl = [];
                } else {
                    const start = (pageNum - 1) * perPagesNum;
                    const end = start + perPagesNum;
                    paginatedColl = grpByCollection.slice(start, end);
                }

                ctx.send({totalCount, paginatedColl});

            } else if (groupBy === "tag") {
                let grpByTag = [];
                for (let gem of gems) {
                    if (gem.tags && gem.tags.length > 0) {
                        for (let tag of gem.tags) {
                            const existingTag = grpByTag.find(
                                (tagColl) => tagColl.tagName === tag.tag
                            );

                            if (existingTag) {
                                existingTag.gems.push(gem);
                            } else {
                                grpByTag.push({
                                    tagName: tag.tag,
                                    gems: [gem],
                                });
                            }
                        }
                    } else {
                        const existingTag = grpByTag.find(
                            (tagColl) => tagColl.tagName === "No-tag"
                        );

                        if (existingTag) {
                            existingTag.gems.push(gem);
                        } else {
                            grpByTag.push({
                                tagName: "No-tag",
                                gems: [gem],
                            });
                        }
                    }
                }

                const totalCount = grpByTag.length;
                const totalPages = Math.ceil(parseInt(grpByTag.length) / perPagesNum);
                let paginateTag;
                if (pageNum > totalPages) {
                    paginateTag = [];
                } else {
                    const start = (pageNum - 1) * perPagesNum;
                    const end = start + perPagesNum;
                    paginateTag = grpByTag.slice(start, end);
                }

                ctx.send({totalCount, paginateTag});
            }


        } catch (error) {
            ctx.send({ status: 400, message: error })
        }
    },

    async filterTag(ctx) {
        try {
            const { user } = ctx.state;

            const tags = await strapi.entityService.findMany("api::tag.tag", {
                filters: { users: user.id },
                fields: ["id", "tag", "slug"],
                populate: {
                    gems: {
                        fields: ["id", "url", "slug", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "socialfeedAt", "expander", "platform", "isRead", "comments_count", "shares_count", "likes_count", "save_count"],
                    }
                }
            })

            tags.sort((a, b) => b.gems.length - a.gems.length);
            const topTags = tags.slice(0, 10);
            ctx.send({ status: 200, data: topTags })

        } catch (error) {
            ctx.send({ status: 400, message: error })
        }
    }


}))