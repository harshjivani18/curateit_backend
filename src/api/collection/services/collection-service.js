exports.prepareSubCollectionData = (coll, mainData) => {
    let obj
    let approvedCollectionGems = coll?.gems?.filter((data) => {
        if ((data?.author?.id === coll?.author?.id) || (data?.isApproved === true && data?.isPending === false)) {
            return data
        }
    })
    const bookmarksCount = approvedCollectionGems?.length || 0

    if (coll?.parent_collection === null || coll?.parent_collection === undefined || coll?.parent_collection?.length === 0) {
        delete coll?.parent_collection
        delete coll?.gems
        obj = {
            ...coll,
            bookmarksCount,
            bookmarks: approvedCollectionGems?.slice(0, 5)
        }

        return obj
    }

    // if (Array.isArray(coll.parent_collection)) {
    //     const copyObj = coll.gems ? [...coll.gems] : []
    //     const obj = {
    //         ...coll,
    //         folders: [],
    //         // bookmarks: copyObj
    //         bookmarks: approvedCollectionGems.slice(0,5)

    //     }
    //     coll.parent_collection?.forEach((p) => {
    //         const idx = mainData.findIndex((d) => { return d.id === p.id })
    //         if (idx !== -1) {
    //             obj.folders = [...obj.folders, ...this.prepareSubCollectionData(mainData[idx], mainData)]
    //         }
    //     })
    //     delete obj.parent_collection
    //     delete obj.gems
    //     return [obj]
    // }
}

exports.subCollectionIds = (coll, mainData) => {
    const arr = []

    if (coll?.parent_collection === null || coll?.parent_collection === undefined || coll?.parent_collection?.length === 0) {
        delete coll?.parent_collection
        arr.push({
            ...coll,
        })

        return arr
    }

    if (Array.isArray(coll.parent_collection)) {
        const obj = {
            ...coll,
            folders: [],
        }
        coll.parent_collection?.forEach((p) => {
            const idx = mainData.findIndex((d) => { return d.id === p.id })
            if (idx !== -1) {
                obj.folders = [...obj.folders, ...this.subCollectionIds(mainData[idx], mainData)]
            }
        })
        delete obj.parent_collection
        return [obj]
    }
}

const idsss = (finalCollection) => {
    let arr = []
    finalCollection?.map((data) => {
        if (data?.folders?.length > 0) {
            arr = [...arr, ...idsss(data.folders)]
        }
        arr.push(data.id)
    })
    return arr;
}

exports.updateSubCollections = async (collectionId, userId, viewSubCollection) => {

    const collection = await strapi.entityService.findMany('api::collection.collection', {
        filters: {
            author: userId
        },
        sort: { id: 'asc' },
        fields: ["id", "name", "slug"],
        populate: {
            parent_collection: {
                fields: ["id", "name", "slug"],
            },
        }
    });

    let parentColl = collection.filter((d) => {
        return d.id === parseInt(collectionId)
    })
    let finalCollection = this.subCollectionIds(parentColl[0], collection)

    const ids = idsss(finalCollection[0]?.folders)
    await strapi.db.query("api::collection.collection").updateMany({
        where: { id: ids },
        data: {
            viewSubCollection: viewSubCollection
        }
    })
    return "success"
}

exports.collectionData = (data) => {
    let arr = []
    data.map(coll => {
        let approvedCollectionGems = coll?.gems?.filter((d) => {
            if ((d?.author?.id === coll?.author?.id) || (d?.isApproved === true && d?.isPending === false)) {
                return data
            }
        })
        const bookmarksCount = approvedCollectionGems?.length || 0

        delete coll?.gems
        const obj = {
            ...coll,
            bookmarksCount,
            bookmarks: approvedCollectionGems?.slice(0, 5) || []
        }
        arr.push(obj)
    })
    return arr
};

exports.deleteEmptyCollectionsService = async (id, collection, bcid, bid, uid) => {
    try {
        const collectionIds = []
        collection?.map((c) => collectionIds.push(c.id))

        await this.collectionOrderAtDeleteMany(id, collectionIds)
 
        await strapi.db.query("api::collection.collection").deleteMany({
            where: { id: collectionIds }
        })

        const collectionsData = await strapi.entityService.findMany("api::collection.collection", {
            filters: {
                author: id, gems: null, parent_collection: null,
                id: { $notIn: [bcid, bid, uid] }
            },
        })

        if (collectionsData && collectionsData.length > 0) {
            await this.deleteEmptyCollectionsService(id, collectionsData, bcid, bid, uid)
        }
        return "success"
    } catch (error) {
        return error.message
    }
};

exports.prepareRequireCollectionData = (coll, mainData) => {
    const arr = []
    let approvedCollectionGems = coll.gems.filter((data) => {
        if ((data?.author?.id === coll.author.id) || (data.isApproved === true && data.isPending === false)) {
            return data
        }
    })

    if (coll.parent_collection === null || coll.parent_collection === undefined || coll.parent_collection?.length === 0) {
        delete coll.parent_collection
        delete coll.gems
        arr.push({
            ...coll,
            folders: [],
            bookmarks: approvedCollectionGems
        })

        return arr
    }

    if (Array.isArray(coll.parent_collection)) {
        const obj = {
            ...coll,
            folders: [],
            bookmarks: approvedCollectionGems
        }
        coll.parent_collection?.forEach((p) => {
            const idx = mainData.findIndex((d) => { return d.id === p.id })
            if (idx !== -1) {
                obj.folders = [...obj.folders, ...this.prepareRequireCollectionData(mainData[idx], mainData)]
            }
        })
        delete obj.parent_collection
        delete obj.gems
        return [obj]
    }
}

exports.getCollections = async (page, perPage, userId, tabGemCollection) => {
    try {
        // using for getTabGems
        // const pages = page ? page : 1;
        // const perPages = perPage ? perPage : 10;
        // const pageNum = parseInt(pages);
        // const perPagesNum = parseInt(perPages);

        let filters = {};
        let fields;
        let populate = {};
        if (tabGemCollection) {
            filters.author = userId;
            filters.gems = { isTabCollection: true };
            fields = ["id", "slug", "name", "avatar", "is_sub_collection", "media_type", "background"];
            populate.gems = { filters: { isTabCollection: true } };
            populate.collection = { fields: ["id", "name", "slug"] };
        }

        let [collections, count] = await Promise.all([
            strapi.entityService.findMany("api::collection.collection", {
                filters,
                fields,
                populate,
                sort: { id: "asc" },
                // start: pageNum === 0 ? 0 : (pageNum - 1) * perPagesNum,
                // limit: perPagesNum,
            }),
            strapi.entityService.count("api::collection.collection", {
                filters
            })
        ])

        if (tabGemCollection) {
            collections?.forEach((c) => {
                c.gemCount = c.gems.length
                delete c.gems
            })
        }

        return ({ collections, count })
    } catch (error) {
        return error.message
    }
}

exports.exportCollectionData = (coll, workbook, collectionId) => {
    if (coll?.folders && coll?.folders.length > 0) {
        coll.folders.forEach((c) => this.exportCollectionData(c, workbook, collectionId))
    }

    const worksheet = workbook.addWorksheet(`${coll?.name}_sheet`);

    // Define column headers
    const cols = [
        { header: "Collection Name", key: "name", width: 20 },
        { header: "Gem Title", key: "title", width: 20 },
        { header: "Gem Description", key: "description", width: 20 },
        { header: "Gem Url", key: "url", width: 20 },
    ];

    if (coll?.id !== collectionId) {
        cols.push({ header: "Parent Collection", key: "parent_collection", width: 20 })
    }

    worksheet.columns = cols

    // Add data rows
    let counter = 1
    coll.bookmarks.forEach((g) => {
        let row = {
            s_no: counter++,
            ...coll,
            ...g
        };

        if (coll?.id !== collectionId) {
            row = { ...row, ...coll?.collection, name: coll?.name, parent_collection: coll?.collection?.name }
        }

        worksheet.addRow(row);
    });

    // Make the first row bold
    worksheet.getRow(1).eachCell(cell => {
        cell.font = { bold: true };
    });

}

exports.getPublicParentCollection = async (parentCollection) => {
    try {
        let approvedCollectionGems = parentCollection?.gems?.filter((data) => {
            if ((data?.author?.id === parentCollection?.author?.id) || (data?.isApproved === true && data?.isPending === false)) {
                return data
            }
        })
        const count = approvedCollectionGems?.length;
        let bookmarks = approvedCollectionGems;
        parentCollection.bookmarks = bookmarks;
        parentCollection.count = count;
        delete parentCollection?.gems;

        const follower = await strapi.db.query("api::follower.follower").findOne({
            where: { userId: parentCollection?.author?.id.toString() },
            populate: {
                follower_users: {
                    select: ['id']
                }
            }
        })
        parentCollection.author.follower = follower?.follower_users
        parentCollection.author.following = follower?.following_users

        return parentCollection;

    } catch (error) {
        return error.message;
    }
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

exports.getCollectionOrder = async (id, uniqueOrder, collectionIds, collectionArr, subCollection=false) => {
    try {
        const isArraySame = arraysHaveSameElements(uniqueOrder, collectionIds)
        let uniqueMergedArray = null;

        if (uniqueOrder.length === 0 || !isArraySame || uniqueOrder.length !== collectionIds.length) {
            const mergedArray = uniqueOrder.concat(collectionIds.filter(e => !uniqueOrder.includes(e)));
            uniqueMergedArray = [...new Set(mergedArray)]
            
            subCollection 
            ? strapi.entityService.update("api::collection.collection", id, {
                data: { order_of_sub_collections: uniqueMergedArray }
            }) 
            : strapi.db.query("api::bookmark-config.bookmark-config").update({
                where: { author: id },
                data: { order_of_collections: uniqueMergedArray }
            })

        }

        // const finalCollectionArr = uniqueMergedArray ? uniqueMergedArray.map(id => collectionArr.find(c => c.id === id)) : uniqueOrder?.map(id => collectionArr.find(c => c.id === id));
        let finalCollectionArr = []
        if (uniqueMergedArray) {
            uniqueMergedArray.forEach(id => {
            const collection = collectionArr.find(c => c?.id === id)
            if (collection) {
                finalCollectionArr.push(collection)
            }
            })
        } else {
            uniqueOrder?.forEach(id => {
            const collection = collectionArr.find(c => c?.id === id)
            if (collection) {
                finalCollectionArr.push(collection)
            }
            })
        }

        return finalCollectionArr
    } catch (error) {
        console.log("getCollection Error ===>", error.message);
    }
}

exports.collectionOrderAtUpdateCollection = async (userId, oldCollectionData, data) => {
    try {
        if (data?.isRoot) {
            const bookmarkConfig = await strapi.db.query("api::bookmark-config.bookmark-config").findOne({
                where: { author: userId },
                select: ["id", "order_of_collections"]
            })

            const newBookmarkConfigOrder = bookmarkConfig?.order_of_collections ? [...bookmarkConfig.order_of_collections, oldCollectionData.id] : [oldCollectionData.id]

            await strapi.entityService.update("api::bookmark-config.bookmark-config", bookmarkConfig?.id, {
                data: {
                    order_of_collections: newBookmarkConfigOrder
                }
            })

            const cIdx = oldCollectionData?.collection?.order_of_sub_collections?.indexOf(parseInt(oldCollectionData?.id))

            if (cIdx !== -1) {
                oldCollectionData?.collection?.order_of_sub_collections?.splice(cIdx, 1)

                await strapi.entityService.update("api::collection.collection", oldCollectionData?.collection?.id, {
                    data: {
                        order_of_sub_collections: oldCollectionData?.collection?.order_of_sub_collections
                    }
                })
            }
        }

        if (!oldCollectionData?.collection) {
            const bookmarkConfig = await strapi.db.query("api::bookmark-config.bookmark-config").findOne({
                where: { author: userId },
                select: ["id", "order_of_collections"]
            })

            const cIdx = bookmarkConfig?.order_of_collections?.indexOf(parseInt(oldCollectionData?.id))

            if (cIdx !== -1) {
                bookmarkConfig?.order_of_collections?.splice(cIdx, 1)

                await strapi.entityService.update("api::bookmark-config.bookmark-config", bookmarkConfig?.id, {
                    data: {
                        order_of_collections: bookmarkConfig?.order_of_collections
                    }
                })
            }

            const collection = await strapi.entityService.findOne("api::collection.collection", parseInt(data?.collection), {
                fields: ["id", "order_of_sub_collections"]
            })

            const newOrderOfSubCollection = collection?.order_of_sub_collections ? [...collection.order_of_sub_collections, oldCollectionData.id] : [oldCollectionData.id]

            await strapi.entityService.update("api::collection.collection", parseInt(data?.collection), {
                data: {
                    order_of_sub_collections: newOrderOfSubCollection
                }
            })

        }

        if (oldCollectionData?.collection) {
            const newCollection = await strapi.entityService.findOne("api::collection.collection", parseInt(data?.collection), {
                fields: ["id", "order_of_sub_collections"]
            })
            const newOrderOfSubCollection = newCollection?.order_of_sub_collections ? [...newCollection.order_of_sub_collections, oldCollectionData.id] : [oldCollectionData.id]

            await strapi.entityService.update("api::collection.collection", parseInt(data?.collection), {
                data: {
                    order_of_sub_collections: newOrderOfSubCollection
                }
            })

            const cIdx = oldCollectionData?.collection?.order_of_sub_collections?.indexOf(parseInt(oldCollectionData?.id))

            if (cIdx !== -1) {
                oldCollectionData?.collection?.order_of_sub_collections?.splice(cIdx, 1)

                await strapi.entityService.update("api::collection.collection", oldCollectionData?.collection?.id, {
                    data: {
                        order_of_sub_collections: oldCollectionData?.collection?.order_of_sub_collections
                    }
                })
            }
        }
    } catch (error) {
        console.log("collectionOrderAtUpdateCollection Error ===>", error.message);
    }
}

exports.collectionOrderAtCreateCollection = async (userId, data) => {
    try {
        const collection = await strapi.entityService.findOne("api::collection.collection", parseInt(data?.id), {
            fields: ["id", "order_of_sub_collections"],
            populate: {
                collection: {
                    fields: ["id", "order_of_sub_collections"]
                }
            }
        })

        if (!collection?.collection) {
            const bookmarkConfig = await strapi.db.query("api::bookmark-config.bookmark-config").findOne({
                where: { author: userId },
                select: ["id", "order_of_collections"]
            })
            await strapi.entityService.update("api::bookmark-config.bookmark-config", bookmarkConfig?.id, {
                data: {
                    order_of_collections: bookmarkConfig?.order_of_collections ? [...bookmarkConfig.order_of_collections, data.id] : [data.id]
                }
            })
        }

        if (collection?.collection) {
           await strapi.entityService.update("api::collection.collection", parseInt(collection?.collection?.id), {
                data: {
                    order_of_sub_collections: collection?.collection?.order_of_sub_collections ? [...collection.collection.order_of_sub_collections, data.id] : [data.id]
                }
            })
        }
        
    } catch (error) {
        console.log("collectionOrderAtCreateCollection  error ====>", error.message);
    }
}

exports.collectionOrderAtDeleteCollection = async (userId, collectionId) => {
    try {
        const collection = await strapi.entityService.findOne("api::collection.collection", parseInt(collectionId), {
            fields: ["id", "order_of_sub_collections"],
            populate: {
                collection: {
                    fields: ["id", "order_of_sub_collections"]
                }
            }
        })

        if (!collection?.collection) {
            const bookmarkConfig = await strapi.db.query("api::bookmark-config.bookmark-config").findOne({
                where: { author: userId },
                select: ["id", "order_of_collections"]
            })
            const cIdx = bookmarkConfig?.order_of_collections?.indexOf(parseInt(collectionId))

            if (cIdx !== -1) {
                bookmarkConfig?.order_of_collections?.splice(cIdx, 1)

                await strapi.entityService.update("api::bookmark-config.bookmark-config", bookmarkConfig?.id, {
                    data: {
                        order_of_collections: bookmarkConfig?.order_of_collections
                    }
                })
            }
        }

        if (collection?.collection) {
            const cIdx = collection?.collection?.order_of_sub_collections?.indexOf(parseInt(collectionId))

            if (cIdx !== -1) {
                collection?.collection?.order_of_sub_collections?.splice(cIdx, 1)

                await strapi.entityService.update("api::collection.collection", parseInt(collection?.collection?.id), {
                    data: {
                        order_of_sub_collections: collection?.collection?.order_of_sub_collections
                    }
                })
            }
        }
    } catch (error) {
        console.log("collectionOrderAtDeleteCollection  error ====>", error.message);
    }
}

exports.collectionOrderAtDeleteMany = async (userId, collectionIds) => {
    try {
        for (const id of collectionIds) {
            const collection = await strapi.entityService.findOne("api::collection.collection", parseInt(id), {
                fields: ["id", "order_of_sub_collections"],
                populate: {
                    collection: {
                        fields: ["id", "order_of_sub_collections"]
                    }
                }
            })

            if (!collection?.collection) {
                const bookmarkConfig = await strapi.db.query("api::bookmark-config.bookmark-config").findOne({
                    where: { author: userId },
                    select: ["id", "order_of_collections"]
                })

                const cIdx = bookmarkConfig?.order_of_collections?.indexOf(parseInt(id))

                if (cIdx !== -1) {
                    bookmarkConfig?.order_of_collections?.splice(cIdx, 1)

                    await strapi.entityService.update("api::bookmark-config.bookmark-config", bookmarkConfig?.id, {
                        data: {
                            order_of_collections: bookmarkConfig?.order_of_collections
                        }
                    })
                }
            }

            if (collection?.collection) {
                const cIdx = collection?.collection?.order_of_sub_collections?.indexOf(parseInt(id))

                if (cIdx !== -1) {
                    collection?.collection?.order_of_sub_collections?.splice(cIdx, 1)

                    await strapi.entityService.update("api::collection.collection", parseInt(collection?.collection?.id), {
                        data: {
                            order_of_sub_collections: collection?.collection?.order_of_sub_collections
                        }
                    })
                }
            }
        }
    } catch (error) {
        console.log("collectionOrderAtDeleteMany error ====>", error.message);
    }
}