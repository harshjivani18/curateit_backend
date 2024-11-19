exports.deleteEmptyTagService = async (id, tags) => {
    try {
        const tagIds = []
        tags?.map((c) => tagIds.push(c.id))

        await this.tagOrderAtDeleteMany(id, tagIds)
        await strapi.db.query("api::tag.tag").deleteMany({
            where: { id: tagIds }
        })

        const tagsData = await strapi.entityService.findMany("api::tag.tag", {
            filters: {
                users: id, gems: null, child_tags: null,
            },
        })
        if (tagsData && tagsData.length > 0) {
           await this.deleteEmptyTagService(id, tagsData)
        }
        return "success"
    } catch (error) {
        return error.message
    }
}

exports.prepareSubTagData = (tag) => {
    let obj
    let approvedTagGems = tag?.gems?.filter((data) => {
        if ((data?.author?.id === tag?.users[0]?.id) || (data?.isApproved === true && data?.isPending === false)) {
            return data
        }
    })
    const bookmarksCount = approvedTagGems?.length || 0

    if (tag?.child_tags === null || tag?.child_tags === undefined || tag?.child_tags?.length === 0) {
        delete tag?.child_tags
        delete tag?.gems
        obj = {
            ...tag,
            bookmarksCount,
            bookmarks: approvedTagGems?.slice(0, 5)
        }

        return obj
    }
}

exports.subTagIds = (tag, mainData, subTag=false) => {
    const arr = []

    let approvedCollectionGems = tag?.gems?.filter((data) => {
        if ((data?.author?.id === tag?.users[0].id) || (data?.isApproved === true && data?.isPending === false)) {
            return data
        }
    })

    if (tag?.child_tags === null || tag?.child_tags === undefined || tag?.child_tags?.length === 0) {

        delete tag?.gems
        delete tag?.child_tags
        if (subTag) {
            tag.author = (tag.users.length > 0) ? tag.users[0] : null
            delete tag.users
        }
        arr.push({
            ...tag,
            bookmarksCount: subTag ? approvedCollectionGems?.length : 0,
        })

        return arr
    }

    if (Array.isArray(tag.child_tags)) {

        const obj = {
            ...tag,
            folders: [],
            bookmarksCount: subTag ? approvedCollectionGems?.length : 0,
        }
        tag.child_tags?.forEach((p) => {
            const idx = mainData.findIndex((d) => { return d.id === p.id })
            if (idx !== -1) {
                obj.folders = [...obj.folders, ...this.subTagIds(mainData[idx], mainData, subTag)]
            }
        })
        if (subTag) {
            obj.author = (obj.users.length > 0) ? obj.users[0] : null
            delete obj.users
        }
        delete obj.child_tags
        delete obj.gems
        return [obj]
    }
}

const idsss = (finalTag) => {
    let arr = []
    finalTag?.map((data) => {
        if (data?.folders?.length > 0) {
            arr = [...arr, ...idsss(data.folders)]
        }
        arr.push(data.id)
    })
    return arr;
}

exports.updateSubTags = async (tagId, userId, viewSubTag) => {

    const tags = await strapi.entityService.findMany('api::tag.tag', {
        filters: {
            users: userId
        },
        sort: { id: 'asc' },
        fields: ["id", "tag", "slug"],
        populate: {
            child_tags: {
                fields: ["id", "tag", "slug"],
            },
        }
    });

    let parentColl = tags.filter((d) => {
        return d.id === parseInt(tagId)
    })
    let finalTag = this.subTagIds(parentColl[0], tags)

    const ids = idsss(finalTag[0]?.folders)
    await strapi.db.query("api::tag.tag").updateMany({
        where: { id: ids },
        data: {
            viewSubTag: viewSubTag
        }
    })
    return "success"
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

exports.getTagOrder = async (id, uniqueOrder, tagIds, tagArr, subTag=false) => {
    try {

        const isArraySame = arraysHaveSameElements(uniqueOrder, tagIds)
        let uniqueMergedArray = null;

        if (uniqueOrder.length === 0 || !isArraySame || uniqueOrder.length !== tagIds.length) {
            const mergedArray = uniqueOrder.concat(tagIds.filter(e => !uniqueOrder.includes(e)));
            uniqueMergedArray = [...new Set(mergedArray)]

            subTag
            ? strapi.entityService.update("api::tag.tag", id, {
                data: { order_of_sub_tags: uniqueMergedArray }
            }) 
            : strapi.db.query("api::bookmark-config.bookmark-config").update({
                where: { author: id },
                data: { order_of_tags: uniqueMergedArray }
            })

        }

        // const finalTagArr = uniqueMergedArray ? uniqueMergedArray.map(id => tagArr.find(t => t.id === id)) : uniqueOrder?.map(id => tagArr.find(t => t.id === id));
        let finalTagArr = []
        if (uniqueMergedArray) {
            uniqueMergedArray.forEach(id => {
            const tag = tagArr.find(t => t?.id === id)
            if (tag) {
                finalTagArr.push(tag)
            }
            })
        } else {
            uniqueOrder?.forEach(id => {
            const tag = tagArr.find(t => t?.id === id)
            if (tag) {
                finalTagArr.push(tag)
            }
            })
        }

        return finalTagArr
    } catch (error) {
        console.log("getTagOrder Error ===>", error.message);
    }
}

exports.tagOrderAtUpdateTag = async (userId, oldTagData, data) => {
    try {

        if (data?.isRoot) {
            const bookmarkConfig = await strapi.db.query("api::bookmark-config.bookmark-config").findOne({
                where: { author: userId },
                select: ["id", "order_of_tags"]
            })

            const newBookmarkConfigOrder = bookmarkConfig?.order_of_tags ? [...bookmarkConfig.order_of_tags, oldTagData.id] : [oldTagData.id]

            await strapi.entityService.update("api::bookmark-config.bookmark-config", bookmarkConfig?.id, {
                data: {
                    order_of_collections: newBookmarkConfigOrder
                }
            })

            const cIdx = oldTagData?.parent_tag?.order_of_sub_tags?.indexOf(parseInt(oldTagData?.id))

            if (cIdx !== -1) {
                oldTagData?.parent_tag?.order_of_sub_tags?.splice(cIdx, 1)

                await strapi.entityService.update("api::tag.tag", oldTagData?.parent_tag?.id, {
                    data: {
                        order_of_sub_tags: oldTagData?.parent_tag?.order_of_sub_tags
                    }
                })
            }
        }

        if (!oldTagData?.parent_tag) {
            const bookmarkConfig = await strapi.db.query("api::bookmark-config.bookmark-config").findOne({
                where: { author: userId },
                select: ["id", "order_of_tags"]
            })

            const cIdx = bookmarkConfig?.order_of_tag?.indexOf(parseInt(oldTagData?.id))

            if (cIdx !== -1) {
                bookmarkConfig?.order_of_tags?.splice(cIdx, 1)

                await strapi.entityService.update("api::bookmark-config.bookmark-config", bookmarkConfig?.id, {
                    data: {
                        order_of_tags: bookmarkConfig?.order_of_tags
                    }
                })
            }

            const tag = await strapi.entityService.findOne("api::tag.tag", parseInt(data?.parent_tag), {
                fields: ["id", "order_of_sub_tags"]
            })

            const newOrderOfSubTag = tag?.order_of_sub_tags ? [...tag.order_of_sub_tags, oldTagData.id] : [oldTagData.id]

            await strapi.entityService.update("api::tag.tag", parseInt(data?.parent_tag), {
                data: {
                    order_of_sub_tags: newOrderOfSubTag
                }
            })

        }

        if (oldTagData?.parent_tag) {
            const newTag = await strapi.entityService.findOne("api::tag.tag", parseInt(data?.parent_tag), {
                fields: ["id", "order_of_sub_tags"]
            })
            const newOrderOfSubTag = newTag?.order_of_sub_Tags ? [...newTag.order_of_sub_tags, oldTagData.id] : [oldTagData.id]

            await strapi.entityService.update("api::tag.tag", parseInt(data?.parent_tag), {
                data: {
                    order_of_sub_tags: newOrderOfSubTag
                }
            })

            const cIdx = oldTagData?.parent_tag?.order_of_sub_tags?.indexOf(parseInt(oldTagData?.id))

            if (cIdx !== -1) {
                oldTagData?.parent_tag?.order_of_sub_tags?.splice(cIdx, 1)

                await strapi.entityService.update("api::tag.tag", oldTagData?.parent_tag?.id, {
                    data: {
                        order_of_sub_tags: oldTagData?.parent_tag?.order_of_sub_tags
                    }
                })
            }
        }
    } catch (error) {
        console.log("collectionOrderAtUpdateCollection Error ===>", error.message);
    }
}

exports.tagOrderAtCreateTag = async (userId, data) => {
    try {
        const tag = await strapi.entityService.findOne("api::tag.tag", parseInt(data?.id), {
            fields: ["id", "order_of_sub_tags"],
            populate: {
                parent_tag: {
                    fields: ["id", "order_of_sub_tags"]
                }
            }
        })

        if (!tag?.parent_tag) {
            const bookmarkConfig = await strapi.db.query("api::bookmark-config.bookmark-config").findOne({
                where: { author: userId },
                select: ["id", "order_of_tags"]
            })
            await strapi.entityService.update("api::bookmark-config.bookmark-config", bookmarkConfig?.id, {
                data: {
                    order_of_tags: bookmarkConfig?.order_of_tags ? [...bookmarkConfig.order_of_tags, data.id] : [data.id]
                }
            })
        }

        if (tag?.parent_tag) {
           await strapi.entityService.update("api::tag.tag", parseInt(tag?.parent_tag?.id), {
                data: {
                    order_of_sub_tags: tag?.parent_tag?.order_of_sub_tags ? [...tag.parent_tag.order_of_sub_tags, data.id] : [data.id]
                }
            })
        }
        
    } catch (error) {
        console.log("collectionOrderAtCreateCollection  error ====>", error.message);
    }
}

exports.tagOrderAtDeleteTag = async (userId, tagId) => {
    try {
        const tag = await strapi.entityService.findOne("api::tag.tag", parseInt(tagId), {
            fields: ["id", "order_of_sub_tags"],
            populate: {
                parent_tag: {
                    fields: ["id", "order_of_sub_tags"]
                }
            }
        })

        if (!tag?.parent_tag) {
            const bookmarkConfig = await strapi.db.query("api::bookmark-config.bookmark-config").findOne({
                where: { author: userId },
                select: ["id", "order_of_collections"]
            })
            const cIdx = bookmarkConfig?.order_of_tags?.indexOf(parseInt(tagId))

            if (cIdx !== -1) {
                bookmarkConfig?.order_of_tag?.splice(cIdx, 1)

                await strapi.entityService.update("api::bookmark-config.bookmark-config", bookmarkConfig?.id, {
                    data: {
                        order_of_tags: bookmarkConfig?.order_of_tags
                    }
                })
            }
        }

        if (tag?.parent_tag) {
            const cIdx = tag?.parent_tag?.order_of_sub_tags?.indexOf(parseInt(tagId))

            if (cIdx !== -1) {
                tag?.parent_tag?.order_of_sub_tags?.splice(cIdx, 1)

                await strapi.entityService.update("api::tag.tag", parseInt(tag?.parent_tag?.id), {
                    data: {
                        order_of_sub_tags: tag?.parent_tag?.order_of_sub_tags
                    }
                })
            }
        }
    } catch (error) {
        console.log("tagOrderAtDeleteTag  error ====>", error.message);
    }
}

exports.tagOrderAtDeleteMany = async (userId, tagIds) => {
    try {

        for (const id of tagIds) {
            const tag = await strapi.entityService.findOne("api::tag.tag", parseInt(id), {
                fields: ["id", "order_of_sub_tags"],
                populate: {
                    parent_tag: {
                        fields: ["id", "order_of_sub_tags"]
                    }
                }
            })

            if (!tag?.parent_tag) {
                const bookmarkConfig = await strapi.db.query("api::bookmark-config.bookmark-config").findOne({
                    where: { author: userId },
                    select: ["id", "order_of_tags"]
                })

                const cIdx = bookmarkConfig?.order_of_tags?.indexOf(parseInt(id))

                if (cIdx !== -1) {
                    bookmarkConfig?.order_of_tags?.splice(cIdx, 1)

                    await strapi.entityService.update("api::bookmark-config.bookmark-config", bookmarkConfig?.id, {
                        data: {
                            order_of_tags: bookmarkConfig?.order_of_tags
                        }
                    })
                }
            }

            if (tag?.parent_tag) {
                const cIdx = tag?.parent_tag?.order_of_sub_tags?.indexOf(parseInt(id))

                if (cIdx !== -1) {
                    tag?.parent_tag?.order_of_sub_tags?.splice(cIdx, 1)

                    await strapi.entityService.update("api::tag.tag", parseInt(tag?.parent_tag?.id), {
                        data: {
                            order_of_sub_tags: tag?.parent_tag?.order_of_sub_tags
                        }
                    })
                }
            }
        }
    } catch (error) {
        console.log("tagOrderAtDeleteMany error ====>", error.message);
    }
}