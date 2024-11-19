'use strict';

/**
 * tag controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { updatePlanService } = require("../../../../utils");
const { deleteGems } = require('../../gem/services/gem-service');
const { deleteEmptyTag, deleteEmptyTagService, prepareSubTagData, getTagOrder, tagOrderAtDeleteMany } = require('../services/tag-service');

const countOccurrences = async (arr) => {
    return arr.reduce((acc, val) => {
        acc[val] = (acc[val] || 0) + 1;
        return acc;
    }, {});
}

const arraysHaveSameElements = (a, b) => {
    // Sort both arrays
    const sortedArr1 = a.slice().sort();
    const sortedArr2 = b.slice().sort();
  
    // Compare sorted arrays element-wise
    for (let i = 0; i < sortedArr1.length; i++) {
      if (sortedArr1[i] !== sortedArr2[i]) {
        return false;
      }
    }
    for (let i = 0; i < sortedArr2.length; i++) {
      if (sortedArr2[i] !== sortedArr1[i]) {
        return false;
      }
    }
    return true;
  }
  

module.exports = createCoreController('api::tag.tag', ({ strapi }) => ({

    async create(ctx) {
        try {
            const { data } = ctx.request.body;
            const userId = ctx.state.user.id;
            let tag;

            /* Checking limit of tags before create tag */
            const userPlan = await strapi.db.query('api::plan-service.plan-service').findOne({
                where: {
                    author: userId
                }
            })

            // const configLimit = await strapi.entityService.findMany('api::config-limit.config-limit')

            // if (userPlan && userPlan.plan === 'free' && parseInt(userPlan.tag_used) >= parseInt(configLimit[0].tag_limit)) {
            //     return ctx.send({ msg: 'Tag limit is exceeded Please extend your service plan' });
            // }
            if (userPlan && userPlan?.plan === 'free' && parseInt(userPlan?.tag_used) >= parseInt(userPlan?.tag_limit)) {
                return ctx.send({ msg: 'Tag limit is exceeded Please extend your service plan' });
            }

            tag = await strapi.db.query('api::tag.tag').findOne({
                where: { tag: data.tag, users: userId },
            })

            if (!tag) {
                tag = await strapi.db.query('api::tag.tag').create({
                    data: {
                        ...data,
                        users: userId,
                        publishedAt: new Date().toISOString()
                    }
                })
            }

            if (userPlan) {
                await updatePlanService(userId, { tag_used: parseInt(userPlan.tag_used) + 1 });
            }

            ctx.send({ data: tag });

        } catch (err) {
            console.log("error occured :", err);
        }
    },

    async getChildTags(tags, pageNum, perPageNum) {
        const arr = [];
        for (const tag of tags) {
            const obj = {
                ...tag,
                bookmarks: tag.gems || []
            };
            delete obj.gems;
            obj.folders = await this.getChildTags(await strapi.entityService.findMany("api::tag.tag", {
                filters: { parent_tag: tag.id },
                fields: ["id", "tag", "slug", "tagColor", "is_sub_tag", "description", "avatar", "background", "media_type"],
                populate: {
                    gems: {
                        fields: ["id", "url", "slug", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "socialfeedAt", "expander", "platform", "isRead"],
                        populate: {
                            author: { fields: ["id", "username"] }
                        }
                    },
                    parent_tag: {
                        fields: ["id", "tag", "slug", "tagColor", "is_sub_tag"],
                    },
                    // users: {
                    //     fields: ["id", "username"]
                    // }
                }
            }));

            arr.push(obj);
        }
        return arr;
    },

    async find(ctx) {
        try {
            const { user } = ctx.state;
            const { page, perPage } = ctx.request.query;
            const pages = page ? page : 0;
            const perPages = perPage ? perPage : 10;
            const pageNum = parseInt(pages);
            const perPageNum = parseInt(perPages);

            const tags = await strapi.entityService.findMany("api::tag.tag", {
                filters: { users: user.id },
                fields: ["id", "tag", "slug", "tagColor", "is_sub_tag", "wallpaper", "description", "avatar", "background", "media_type"],
                populate: {
                    gems: {
                        fields: ["id", "slug", "url", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "socialfeedAt", "expander", "platform", "isRead"],
                        populate: {
                            author: { fields: ["id", "username"] }
                        }
                    },
                    parent_tag: {
                        fields: ["id", "tag", "slug", "is_sub_tag"],
                    },
                    // users: {
                    //     fields: ["id", "username"]
                    // }
                }
            })

            const tagsDesc = tags.sort((a, b) => {
                const gemCount1 = a.gems ? a.gems.length : 0;
                const gemCount2 = b.gems ? b.gems.length : 0;
                return gemCount2 - gemCount1;
            });
            const finalRes = await this.getChildTags(tagsDesc, pageNum, perPageNum)
            const result = finalRes.filter((f) => { return f.parent_tag === null })
            const tagCount = result.length
            const start = pageNum === 0 ? 0 : (pageNum - 1) * perPageNum;
            const limit = start + perPageNum;
            const tagPagination = result.slice(start, limit);

            ctx.send({ status: 200, tagCount, data: tagPagination })

        } catch (error) {
            ctx.send({ status: 400, error });
        }
    },

    async findOne(ctx) {
        try {
            const { user } = ctx.state;
            const { id } = ctx.request.params;
            const { page, perPage, shareDetails } = ctx.request.query;
            const pages = page ? page : 1;
            const perPages = perPage ? perPage : 10;
            const pageNum = parseInt(pages);
            const perPagesNum = parseInt(perPages);

            if (user) {
                const tags = await strapi.entityService.findOne("api::tag.tag", id, {
                    // fields: ["id", "tag", "slug", "showGem", "background", "wallpaper", "description", "media_type", "order_of_gems", "viewSubTag"],
                    // "tagColor", "is_sub_tag", "wallpaper", "description", "avatar", "background", "media_type", "invitedUsersViaMail", "invitedUsersViaLink", "isPublicLink", "tagPassword", "sharable_links", "seo", "order_of_gems", "showSubTag", "viewSubTag", "showSeo", "showSocialIcon", "shortDescription", "allowUserSubmission", "showSidebar", "allowCopy"],
                    populate: {
                        gems: {
                            fields: ["id", "url", "slug", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "socialfeedAt", "expander", "platform", "isRead", "fileType", "imageColor"],
                            populate: {
                                author: {
                                    fields: ["id", "username"]
                                }
                            }
                        },
                        users: {
                            fields: ["id", "username"]
                        }
                    }
                })
                delete tags?.originalPassword

                let order = tags?.order_of_gems ? tags.order_of_gems : [];
                const tagsId = [];
                tags?.gems?.forEach((g) => {
                    tagsId.push(g.id)
                })

                const isArraySame = arraysHaveSameElements(order, tagsId)
                let mergedArray = null;

                if (order.length === 0 || order.length !== tagsId.length || !isArraySame) {
                    mergedArray = order.concat(tagsId.filter(element => !order.includes(element)));

                    await strapi.entityService.update("api::tag.tag", tags?.id, {
                      data: {
                          order_of_gems: mergedArray
                      }
                    })
                }

                const gems = await strapi.entityService.findMany('api::gem.gem', {
                    filters: { id: { $in:  mergedArray ? mergedArray : order }},
                    populate: {
                        author: {
                            fields: ["id", "username"]
                        },
                        tags: {
                            fields: ["id", "tag", "slug", "avatar"]
                        }
                    }
                  })
                const gemsInOrder = mergedArray ? mergedArray.map(id => gems.find(gem => gem.id === id)) : order?.map(id => gems.find(gem => gem.id === id));

                const totalCount = gemsInOrder.length;
                const totalPages = Math.ceil(parseInt(gemsInOrder.length) / perPagesNum);

                if (pageNum > totalPages) {
                    tags.gems = [];
                } else {
                    const start = (pageNum - 1) * perPagesNum;
                    const end = start + perPagesNum;
                    const paginatedGems = gemsInOrder.slice(start, end);
                    tags.gems = paginatedGems;
                }

                /* Fetching collection-config setting by tagId */
                const bookmarkConfig = await strapi.db.query('api::bookmark-config.bookmark-config').findOne({
                    where: {
                        author: user.id
                    }
                })
                tags.configTag = bookmarkConfig

                if (bookmarkConfig?.configTagSetting) {
                    const configTagExist = bookmarkConfig.configTagSetting.find(c_tag => (parseInt(c_tag.tagId) === parseInt(id)));
                    tags.configTag = configTagExist ? configTagExist : bookmarkConfig;
                }
                delete tags?.configTag?.configCollSetting
                delete tags?.configTag?.configTagSetting
                delete tags?.configTag?.configLinksSetting
                delete tags?.configTag?.configFilterSetting

                if (shareDetails) {
                    delete tags?.gems
                    delete tags?.configTag
                }

                const finalTag = { ...tags, author: (tags.users.length > 0) ? tags.users[0] : null }
                delete finalTag.users
                ctx.send({ status: 200, totalCount, data: finalTag, orderOfSubTags: tags?.order_of_sub_tags })
            }
        } catch (error) {
            ctx.send({ status: 400, error: error.message });
        }
    },

    async moveTags(ctx) {
        const { user } = ctx.state;
        const { sourceTagId, destinationTagId } = ctx.params

        // Remove and update collection from the source to destination
        const tags = await strapi.db.query("api::tag.tag").findMany({
            where: {
                id: {
                    $in: [sourceTagId, destinationTagId]
                }
            },
            populate: {
                parent_tag: true
            }
        })
        const srcIdx = tags.findIndex((f) => { return f.id === parseInt(sourceTagId) })
        const destIdx = tags.findIndex((f) => { return f.id === parseInt(destinationTagId) })

        const source = srcIdx !== -1 ? tags[srcIdx] : null

        const destination = destIdx !== -1 ? tags[destIdx] : null

        if (source && destination && destination.parent_tag && destination.parent_tag.id === source.id) {
            const tagData = await strapi.entityService.update("api::tag.tag", destinationTagId, {
                data: {
                    parent_tag: null,
                    is_sub_tag: false,
                    // isMove: true
                }
            })

            // /* logs data for update hightlighed text  */
            // await strapi.entityService.create("api::activity-log.activity-log", {
            //     data: {
            //         action: "Moved",
            //         module: "Collection",
            //         actionType: "Collection",
            //         collection: coll.id,
            //         author: user.id,
            //         count: 1,
            //         publishedAt: new Date().toISOString(),
            //     },
            // });
        }

        const tag = await strapi.entityService.update("api::tag.tag", sourceTagId, {
            data: {
                parent_tag: destinationTagId,
                is_sub_tag: true,
                // isMove: true
            }
        })

        // /* logs data for update hightlighed text  */
        // await strapi.entityService.create("api::activity-log.activity-log", {
        //     data: {
        //         action: "Moved",
        //         module: "Collection",
        //         actionType: "Collection",
        //         collection: collection.id,
        //         author: user.id,
        //         count: 1,
        //         publishedAt: new Date().toISOString(),
        //     },
        // });

        ctx.send(tag)

    },

    async moveTagToRoot(ctx) {
        // const { user } = ctx.state;
        const { sourceTagId } = ctx.params

        const tag = await strapi.entityService.update("api::tag.tag", sourceTagId, {
            data: {
                parent_tag: null,
                is_sub_tag: false,
            }
        })

        /* logs data for update hightlighed text  */
        // await strapi.entityService.create("api::activity-log.activity-log", {
        //   data: {
        //     action: "Moved",
        //     module: "Collection",
        //     actionType: "Collection",
        //     collection: collection.id,
        //     author: user.id,
        //     count: 1,
        //     publishedAt: new Date().toISOString(),
        //   },
        // });

        ctx.send(tag);
    },

    async randomTagColors(ctx) {
        try {
            const { user } = ctx.state;

            const tags = await strapi.entityService.findMany("api::tag.tag", {
                filters: { users: user.id },
                fields: ["tagColor"]
            })

            const colors = [];
            tags.forEach((t) => {
                if (t.tagColor !== null) {
                    colors.push(t.tagColor)
                }
            })

            const colorOccurrences = await countOccurrences(colors);
            const sortedColors = Object.keys(colorOccurrences).sort((a, b) => colorOccurrences[b] - colorOccurrences[a]);
            const mostUsedColor = sortedColors.slice(0, 10);

            ctx.send({ status: 200, data: mostUsedColor });
        } catch (error) {
            ctx.send({ status: 400, message: error })
        }
    },

    prepareTagWiseCounts(tags) {
        const arr = []
        for (const tag of tags) {
            const obj = {
                id: tag.id,
                tag: tag.tag,
                tagColor: tag.tagColor,
                is_sub_tag: tag.is_sub_tag,
                description: tag.description,
                avatar: tag.avatar,
                slug: tag.slug,
                background: tag.background,
                gems_count: tag.gems.length,
                media_type: tag.media_type
            }
            arr.push(obj)
        }
        return arr
    },

    async prepareChildTagsAndItsCount(childTags, tags, parent) {
        const arr = []
        for (const tag of childTags) {
            const tIdx = tags.findIndex((t) => t.id === tag.id)
            if (tIdx !== -1) {
                const tObj = tags[tIdx]
                const obj = {
                    id: tObj.id,
                    tag: tObj.tag,
                    tagColor: tObj.tagColor,
                    is_sub_tag: tObj.is_sub_tag,
                    description: tObj.description,
                    avatar: tObj.avatar,
                    background: tObj.background,
                    gems_count: tObj.gems.length,
                    collection: parent,
                    media_type: tObj.media_type,
                    slug: tObj.slug,
                    folders: [],
                    shortDescription: tObj.shortDescription
                }

                if (tObj.child_tags?.length > 0) {
                    const orderOfNestedTag = tObj?.order_of_sub_tags || []
                    const uniqueOrderOfNestedTag = [...new Set(orderOfNestedTag)]
                    const pNestedTagId = []
                    tObj.child_tags.forEach((s) => {
                        pNestedTagId.push(s.id)
                    }) 

                    const finalSubTagArr = await getTagOrder(tObj.id, uniqueOrderOfNestedTag, pNestedTagId, tObj.child_tags, true)

                    // obj.folders = await this.prepareChildTagsAndItsCount(tObj.child_tags, tags, { id: tObj.id, tag: tObj.tag })

                    obj.folders = await this.prepareChildTagsAndItsCount(finalSubTagArr, tags, { id: tObj.id, tag: tObj.tag })

                }
                arr.push(obj)
            }
        }
        return arr
    },

    async getTagWiseGemCounts(ctx) {
        const { user } = ctx.state;

        const tags = await strapi.entityService.findMany("api::tag.tag", {
            filters: {
                users: user.id,
            },
            fields: ["id", "tag", "slug", "tagColor", "is_sub_tag", "description", "avatar", "background", "media_type", "shortDescription", "order_of_sub_tags"],
            populate: {
                child_tags: {
                    fields: ["id", "tag", "slug", "tagColor", "is_sub_tag", "description", "avatar", "background", "media_type", "order_of_sub_tags"],
                },
                gems: {
                    fields: ["id", "slug"],
                }
            }
        })

        const notTaggedGems = await strapi.entityService.count("api::gem.gem", {
            filters: {
                author: user.id,
                tags: null,
            },
        })

        const finalArr = [{
            id: "withoutTags",
            tag: "Without Tags",
            tagColor: "#000000",
            is_sub_tag: false,
            description: "",
            avatar: "",
            background: "",
            gems_count: notTaggedGems,
            collection: null,
            slug: "without-tags",
            folders: []
        }]

        const mainArr = tags.filter((t) => t.is_sub_tag === false)
        const bookmarkConfig = await strapi.db.query("api::bookmark-config.bookmark-config").findOne({
            where: { author: user.id },
            select: ["id", "order_of_tags"]
        })

        const tagOrder = bookmarkConfig?.order_of_tags || [];
        const uniquetagOrder = [...new Set(tagOrder)]
        const pTagId = []

        // mainArr.forEach((m) => {
        const tagArr = []
        for (const m of mainArr) {
            pTagId.push(m.id)

            const obj = {
                id: m.id,
                tag: m.tag,
                tagColor: m.tagColor,
                is_sub_tag: m.is_sub_tag,
                description: m.description,
                avatar: m.avatar,
                background: m.background,
                gems_count: m.gems.length,
                media_type: m.media_type,
                folders: [],
                slug: m.slug,
                collection: null,
                shortDescription: m?.shortDescription

            }
            if (m.child_tags?.length > 0) {
                const subTagOrder =  m?.order_of_sub_tags || [];
                const uniqueSubTagOrder = [...new Set(subTagOrder)]
                const pSubTagId = []
                m.child_tags.forEach((s) => {
                    pSubTagId.push(s.id)
                })

                const finalSubTagArr = await getTagOrder(m.id, uniqueSubTagOrder, pSubTagId, m.child_tags, true)

                // obj.folders = this.prepareChildTagsAndItsCount(m.child_tags, tags, { id: m.id, tag: m.tag })
                obj.folders = await this.prepareChildTagsAndItsCount(finalSubTagArr, tags, { id: m.id, tag: m.tag })

            }
            tagArr.push(obj)

        }
        // })

        const finalTagArr = await getTagOrder(user.id, uniquetagOrder, pTagId, tagArr)
        const finalResult = [...finalArr, ...finalTagArr]
        return ctx.send(finalResult)
    },

    async isPublicTag (ctx) {
        const { tagId } = ctx.params
        return ctx.send(await strapi.service('api::tag.checks').checkIsRootPublic(parseInt(tagId)))
    },

    // async findOne(ctx) {
    //     try {
    //         const { user } = ctx.state;
    //         const { id } = ctx.request.params;
    //         const { page, perPage, shareDetails } = ctx.request.query;
    //         const pages = page ? page : 1;
    //         const perPages = perPage ? perPage : 10;
    //         const pageNum = parseInt(pages);
    //         const perPagesNum = parseInt(perPages);

    //         if (user) {
    //             const tags = await strapi.entityService.findOne("api::tag.tag", id, {
    //                 fields: ["id", "tag", "tagColor", "is_sub_tag", "wallpaper", "description", "avatar", "background", "media_type", "invitedUsersViaMail", "invitedUsersViaLink", "isPublicLink", "tagPassword", "sharable_links"],
    //                 populate: {
    //                     gems: {
    //                         fields: ["id", "url", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "socialfeedAt", "expander", "platform", "isRead", "fileType"],
    //                         populate: {
    //                             author: {
    //                                 fields: ["id", "username"]
    //                             }
    //                         }
    //                     },
    //                     users: {
    //                         fields: ["id", "username"]
    //                     }
    //                 }
    //             })

    //             const totalCount = tags.gems.length;
    //             const totalPages = Math.ceil(parseInt(tags.gems.length) / perPagesNum);

    //             if (pageNum > totalPages) {
    //                 tags.gems = [];
    //             } else {
    //                 const start = (pageNum - 1) * perPagesNum;
    //                 const end = start + perPagesNum;
    //                 const paginatedGems = tags.gems.slice(start, end);
    //                 tags.gems = paginatedGems;
    //             }

    //             /* Fetching collection-config setting by tagId */
    //             const bookmarkConfig = await strapi.db.query('api::bookmark-config.bookmark-config').findOne({
    //                 where: {
    //                     author: user.id
    //                 }
    //             })
    //             tags.configTag = bookmarkConfig

    //             if (bookmarkConfig?.configTagSetting) {
    //                 const configTagExist = bookmarkConfig.configTagSetting.find(c_tag => (parseInt(c_tag.tagId) === parseInt(id)));
    //                 tags.configTag = configTagExist ? configTagExist : bookmarkConfig;
    //             }
    //             delete tags?.configTag?.configCollSetting
    //             delete tags?.configTag?.configTagSetting
    //             delete tags?.configTag?.configLinksSetting
    //             delete tags?.configTag?.configFilterSetting

    //             if (shareDetails) {
    //                 delete tags?.gems
    //                 delete tags?.configTag
    //             }

    //             const finalTag = { ...tags, author: (tags.users.length > 0) ? tags.users[0] : null }
    //             delete finalTag.users
    //             ctx.send({ status: 200, totalCount, data: finalTag })
    //         }
    //     } catch (error) {
    //         ctx.send({ status: 400, error });
    //     }
    // },

    async fetchTagWithEmbed(ctx) {
        try {
            const { tagId } = ctx.params
            const { isEmbed, page, perPage } = ctx.request.query;
            const pages = page ? page : 0;
            const perPages = perPage ? perPage : 10;
            const pageNum = parseInt(pages);
            const perPagesNum = parseInt(perPages);

            if (isEmbed === "true") {
                const tags = await strapi.entityService.findOne("api::tag.tag", tagId, {
                    populate: {
                        gems: {
                            fields: ["id", "url", "slug", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "custom_fields_obj", "entityObj", "createdAt", "updatedAt", "broken_link", "expander", "platform", "comments_count", "shares_count", "likes_count", "save_count", "socialfeed_obj"],
                            populate: {
                                author: {
                                    fields: ["id", "username"]
                                }
                            }
                        },
                        users: {
                            fields: ["id", "username"]
                        }
                    }
                })
                delete tags?.originalPassword

                const totalCount = tags.gems.length;
                const totalPages = Math.ceil(parseInt(tags.gems.length) / perPagesNum);

                if (pageNum > totalPages) {
                    tags.gems = [];
                } else {
                    const start = (pageNum - 1) * perPagesNum;
                    const end = start + perPagesNum;
                    const paginatedGems = tags.gems.slice(start, end);
                    tags.gems = paginatedGems;
                }

                const finalTag = { ...tags, author: (tags.users.length > 0) ? tags.users[0] : null }
                delete finalTag.users
                ctx.send({ totalBookmark: totalCount, tags: finalTag });
            } else {
                ctx.send({ status: 400, message: "Not able to see tag data" });
            }
        } catch (error) {
            ctx.send({
                status: 400,
                message: error
            })
        }
    },

    async getAllPublicTags(ctx) {
        try {
            const { page, perPage } = ctx.request.query;
            const pages = page ? parseInt(page) : 0;
            const perPages = perPage ? parseInt(perPage) : 10;
            const tags = await strapi.entityService.findMany("api::tag.tag", {
                filters: { isPublicLink: true, showSeo: true },
                fields: ["id", "tag", "slug", "createdAt", "updatedAt", "isPublicLink", "showSeo"],
                populate: {
                    users: {
                        fields: ["id", "username"]
                    }
                },
                start: pages === 0 ? 0 : (pages - 1) * perPages,
                limit: perPages
            })

            return ctx.send({ status: 200, data: tags })
        }
        catch (e) {
            return ctx.send({ status: 400, message: e })
        }
    },

    async deleteEmptyTag(ctx) {
        try {
            const { id } = ctx.state.user;

            const tags = await strapi.entityService.findMany("api::tag.tag", {
                filters: {
                    users: id, gems: null, child_tags: null,
                },
            })

            const res = await deleteEmptyTagService(id, tags)
            // const tagIds = []
            // tags?.map((c) => tagIds.push(c.id))

            // await strapi.db.query("api::tag.tag").deleteMany({
            //     where: { id: tagIds }
            // })
            if(res !== "success") { return ctx.send({ status: 400, message: res });}

            ctx.send({ status: 200, message: "Empty tag deleted successfully" });

        } catch (error) {
            ctx.send({ status: 400, message: error.message });
        }
    },

    async deleteAllTag(ctx) {
        try {
            const { id } = ctx.state.user;

            const tags = await strapi.entityService.findMany("api::tag.tag", {
                filters: {
                    users: id
                },
                populate: {
                    gems: { fields: ["id", "slug"]}
                }
            })

            let gemsId = [];
            tags?.forEach((t) => {
                t?.gems?.map((g) => gemsId.push(g?.id));    
            })
            gemsId = [...new Set(gemsId)]

            deleteGems(gemsId);

            const tagIds = [];
            tags?.map((c) => tagIds.push(c.id));

            await tagOrderAtDeleteMany(id, tagIds)
            await strapi.db.query("api::tag.tag").deleteMany({
                where: { id: tagIds }
            })

            ctx.send({ status: 200, message: "Tags deleted successfully" });

        } catch (error) {
            ctx.send({ status: 400, message: error.message });
        }
    },

    async subTagData(ctx) {
        try {
            const { user } = ctx.state;
            const { tagId } = ctx.params;
            const { page, perPage } = ctx.request.query;
            const pages = page ? page : 0;
            const perPages = perPage ? perPage : 10;
            const pageNum = parseInt(pages);
            const perPagesNum = parseInt(perPages);
            const start = pageNum === 0 ? 0 : (pageNum - 1) * perPagesNum;
            const limit = start + perPagesNum;

            let tag = await strapi.entityService.findOne("api::tag.tag", tagId, {
                fields: ["id", "tag", "shortDescription", "order_of_sub_tags"],
                populate: {
                    child_tags: {
                        sort: { id: "asc" },
                        start,
                        limit,
                        fields: ["id", "tag", "slug", "wallpaper", "avatar", "background", "description", "is_sub_tag", "shortDescription", "showSidebar", "order_of_sub_tags"],
                        populate: {
                            gems: {
                                fields: ["id", "url", "slug", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "socialfeedAt", "entityObj", "expander", "platform", "isRead", "comments_count", "shares_count", "likes_count", "save_count", "highlightId", "isApproved", "isPending"],
                                populate: {
                                    author: {
                                      fields: ["id", "username"]
                                    },
                                }
                            },
                            users: {
                                fields: ["id", "username"]
                            },
                        }
                    }
                }
            })
            
            const count = tag.child_tags.length

            const subTagOrder =  tag?.order_of_sub_tags || [];
            const uniqueSubTagOrder = [...new Set(subTagOrder)]

            const pSubTagId = []
            tag.child_tags.forEach((s) => {
                pSubTagId.push(s.id)
            })

            const finalSubTagArr = await getTagOrder(tag?.id, uniqueSubTagOrder, pSubTagId, tag?.child_tags, true)

            let finalTag = []
            if (finalSubTagArr.length > 0) {
              tag.child_tags = finalSubTagArr?.slice(start, limit);
              tag.child_tags.filter((data) => {
                finalTag.push(prepareSubTagData(data))
              })
            }

            ctx.send({ status: 200, count, data: finalTag, orderOfSubTags: tag?.order_of_sub_tags })

        } catch (error) {
            return ctx.send({ status: 400, message: error.message });
        }
    }
}));
