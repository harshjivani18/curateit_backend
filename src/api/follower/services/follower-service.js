exports.followedByMeCollectionData = (c) => {
    try {
        // collections?.forEach((c) => {
        // })
        let approvedCollectionGems = []
        c.gems?.forEach((data) => {
            if ((data?.author?.id === c?.author?.id) || (data.isApproved === true && data.isPending === false)) {
                approvedCollectionGems.push(data)
            }
        })
        delete c.gems
        c.gems_count = approvedCollectionGems.length

        return c
    } catch (error) {
        return error.message
    }
}

exports.prepareFollowCollectionData = async (collection, childCollections) => {
    try {
        const updatedCollection = await this.followedByMeCollectionData(collection)
        const updatedObj        = {
            ...updatedCollection,
            folders: []
        }
        if (Array.isArray(childCollections).length !== 0) {
            const arr = []
            for (const c of childCollections) {
                const childCollection = await strapi.entityService.findOne("api::collection.collection", c.id, {
                    fields: ["id", "name", "slug", "avatar", "iconLink", "comments_count", "shares_count", "likes_count", "publicSubCollection", "save_count", "isShareCollection", "invitedUsersViaMail", "invitedUsersViaLinks", "is_sub_collection", "background"],
                    populate: {
                        author: {
                            fields: ["id", "username"]
                        },
                        parent_collection: {
                            fields: ["id", "name",  "slug", "comments_count", "shares_count", "likes_count", "save_count"],
                            populate: {
                                author: {
                                    fields: ["id", "username"]
                                },
                                gems: {
                                    fields: ["id", "isApproved", "isPending"],
                                    populate: {
                                        author: {
                                            fields: ["id", "username"]
                                        },
                                        tags: {
                                            fields: ["id", "tag", "slug"]
                                        }
                                    }
                                }
                            }
                        },
                        gems: {
                            fields: ["id",
                             "isApproved", "isPending"],
                            populate: {
                                author: {
                                    fields: ["id", "username"]
                                },
                                tags: {
                                    fields: ["id", "tag", "slug"]
                                }
                            }
                        },
                        tags: {
                            fields: ["id", "tag", "slug"]
                        }
                    }
                })
                arr.push(await this.prepareFollowCollectionData(childCollection, childCollection.parent_collection))
            }
            updatedObj.folders = [ ...arr ]
        }
        return updatedObj
        // const c = { ...collection }
        // if (collection.parent_collection === null || collection.parent_collection === undefined || collection.parent_collection?.length === 0) {
        //     // delete collection.parent_collection
        //     // arr.push({
        //     //     ...collection,
        //     //     folders: [],
        //     //     bookmarks: approvedCollectionGems
        //     // })
    
        //     // return arr
        //     return { ...collection, folders: [] }
        // }

        // if(Array.isArray(collection.parent_collection)) {
        //     for (const p of collection.parent_collection) {
        //         const obj 
        //     }
        //     // collection.parent_collection.forEach((p) => {

        //     // })
        //     // const obj = {
        //     //     ...coll,
        //     //     folders: [],
        //     //     bookmarks: approvedCollectionGems
        //     // }
        //     // coll.parent_collection?.forEach((p) => {
        //     //     const idx = mainData.findIndex((d) => { return d.id === p.id })
        //     //     if (idx !== -1) {
        //     //         obj.folders = [...obj.folders, ...this.prepareFollowCollectionData()]
        //     //     }
        //     // })
        //     // delete obj.parent_collection
        //     // return [obj]
        // }

    } catch (error) {
        return error.message;
    }
}