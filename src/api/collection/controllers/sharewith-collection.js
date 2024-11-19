const { accessPermissions } = require('../../../../utils');
const { getService } = require('../../../extensions/users-permissions/utils');
const moment = require("moment")
const { v4: uuidv4 } = require("uuid");
const { prepareRequireCollectionData, getPublicParentCollection } = require('../services/collection-service');
const { SHARED_EMAIL } = require('../../../../emails/share-collection');
const { populate } = require('dotenv');
const { shareInviteTopToBottom } = require('../services/share-collection');

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::collection.collection', ({ strapi }) => ({

    async getChildFolder(collection, userId, email) {
        const res = await strapi.db.query('api::collection.collection').findOne({
            where: {
                id: collection.id
            },
            select: ["id", "name", "avatar", "slug", "iconLink", "isShareCollection", "is_sub_collection", "invitedUsersViaMail", "invitedUsersViaLinks"],

            populate: {
                author: {
                    select: ["id", "firstname", "lastname", "username", "profilePhoto"]
                },
                collection: {
                    select: ["id", "name", "slug"],
                    populate: {
                        author: {
                            select: ["id", "firstname", "lastname", "username", "profilePhoto"]
                        },
                    }
                },
                parent_collection: {
                    select: ["id", "name", "slug", "invitedUsersViaMail", "invitedUsersViaLinks"]
                },
                gems: {
                    select: ["id", "url", "slug", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "socialfeedAt", "entityObj", "expander", "platform", "isRead", "comments_count", "shares_count", "likes_count", "save_count", "highlightId"],
                    populate: {
                        author: { select: ["id"]},
                    }
                },
                tags: {
                    select: ["id", "tag", "slug"]
                }
            }
        })
        const invitedUsers = res.invitedUsersViaMail
        const invitedUsersLinks = res.invitedUsersViaLinks
        const currentUser = invitedUsers?.filter((d) => { return (userId && !d.isGroupShare && d.id === userId) || (d.members && d.members?.findIndex((m) => m.id === userId) !== -1) })
        const currentUserLinks = invitedUsersLinks?.filter((d) => { return d.emailArr?.indexOf(email) !== -1 })

        const user = currentUser?.length > 0 ? currentUser[0] : currentUserLinks?.length > 0 ? currentUserLinks[0] : null

        let type;
        let memberPermissions = null
        if (user?.members) {
            const idx = user.members?.findIndex((m) => m?.id === userId)
            if (idx !== -1) {
                type = user.members[idx]?.accessType
                memberPermissions = accessPermissions(type)
            }
        }

        const accessType = type ? type : user?.accessType
        const permissions = memberPermissions ? memberPermissions : user?.permissions

        let approvedCollectionGems = res?.gems?.filter((d) => {
            return ((d?.author?.id === res?.author?.id) || (d?.isApproved === true && d?.isPending === false))
        })
        res.gems_count = approvedCollectionGems?.length

        return { ...res, accessType, permissions }
    },

    async prepareSubFolder(collections, userId, email) {
        const arr = []
        for (const cIdx in collections) {
            const c = collections[cIdx]

            let shareCollection = false
            c?.invitedUsersViaMail?.forEach((i) => {
                if (i?.emailId === email) {
                    shareCollection = true
                }

                if (i?.isGroupShare === true ) {
                    i?.members?.forEach((m) => {
                        if (m?.email === email) {
                            shareCollection = true
                        }
                    })
                }
            })

            if (shareCollection) {
                const p = await this.getChildFolder(c, userId, email)
    
                let folders = []
                if (p.parent_collection?.length > 0) {
                    folders = await this.prepareSubFolder(p.parent_collection, userId, email)
                }
                const copyObj = p.gems ? [...p.gems] : []
                delete p.gems
                delete p.parent_collection
                delete p.invitedUsersViaMail
                delete p.invitedUsersViaLinks
                arr.push({
                    ...p,
                    folders,
                    // bookmarks: copyObj 
                })
            }
        }
        return arr
    },

    async prepareSubShareCollection(collections, userId, email) {
        const arr = []
        for (const idx1 in collections) {
            const invitedUsers = collections[idx1].invitedUsersViaMail
            const invitedUsersLinks = collections[idx1].invitedUsersViaLinks
            const o = collections[idx1]
            const copyObj = o.gems ? [...o.gems] : []
            const currentUser = invitedUsers?.filter((d) => { return (userId && !d.isGroupShare && d.id === userId) || (d.members && d.members?.findIndex((m) => m.id === userId) !== -1) })
            const currentUserLinks = invitedUsersLinks?.filter((d) => { return d.emailArr?.indexOf(email) !== -1 })

            const user = currentUser?.length > 0 ? currentUser[0] : currentUserLinks?.length > 0 ? currentUserLinks[0] : null

            let type;
            let memberPermissions = null
            if (user?.members) {
                const idx = user.members?.findIndex((m) => m?.id === userId)
                if (idx !== -1) {
                    type = user.members[idx]?.accessType
                    memberPermissions = accessPermissions(type)
                }
            }

            const accessType = type ? type : user?.accessType
            // const accessType = user?.accessType
            const permissions = memberPermissions ? memberPermissions :  user?.permissions
            let folders = []
            // delete o.invitedUsersViaMail
            delete o.gems

            if (o.parent_collection?.length > 0) {
                folders = await this.prepareSubFolder(o.parent_collection, userId, email)
            }
            delete o.parent_collection
            delete o.invitedUsersViaLinks
            delete o.usersViaMail
            arr.push({
                ...o,
                accessType,
                permissions,
                folders: folders,
                // bookmarks: copyObj 
            })
            // if (Array.isArray(o.parent_collection) && o.parent_collection.length !== 0) {
            //     const copyObj = o.gems ? [ ...o.gems ] : []
            //     arr.push({
            //         ...o,
            //         folders: await this.prepareSubFolder(o),
            //         bookmarks: copyObj
            //     })
            // }
            // else {
            //     const copyObj = o.gems ? [ ...o.gems ] : []
            //     delete o.usersViaMail
            //     delete o.gems
            //     arr.push({
            //         ...o,
            //         folders: [],
            //         bookmarks: copyObj
            //     })
            // }
        }
        return arr
    },

    async shareWithMeCollections(ctx) {
        try {
            const { user } = ctx.state;

            const entries = await strapi.db.query('api::collection.collection').findMany({
                where: {
                    $or: [
                        {
                            invitedUsersViaMail: {
                                $notNull: true
                            }
                        },
                        {
                            invitedUsersViaLinks: {
                                $notNull: true
                            }
                        }
                    ]
                },
                sort: { id: 'asc' },
                select: ["id", "name", "slug", "avatar", "iconLink", "isShareCollection", "invitedUsersViaMail", "invitedUsersViaLinks", "is_sub_collection", "background"],
                populate: {
                    author: {
                        select: ["id", "firstname", "lastname", "username", "profilePhoto"]
                    },
                    collection: {
                        select: ["id", "name", "slug"],
                        populate: {
                            author: {
                                select: ["id", "firstname", "lastname", "username", "profilePhoto"]
                            },
                        }
                    },
                    parent_collection: {
                        select: ["id", "name",  "slug", "invitedUsersViaMail", "invitedUsersViaLinks"]
                    },
                    gems: {
                        select: ["id", "url", "slug", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "socialfeedAt", "entityObj", "expander", "platform", "isRead", "comments_count", "shares_count", "likes_count", "save_count", "highlightId", "isApproved", "isPending"],
                        populate: {
                            tags: {
                                select: ["id", "tag", "slug", "avatar"]
                            },
                            author: {
                                select: ["id"]
                            },
                        }
                    },
                    tags: {
                        select: ["id", "tag", "slug", "avatar"]
                    }
                }
            });

            let shareArr = []
            const newEntries = entries.map((e) => { return { ...e, usersViaMail: JSON.stringify(e.invitedUsersViaMail) } })
            const eArr = newEntries.filter((n) => { return n.usersViaMail.includes(user.email.toLowerCase()) })
            shareArr = [...shareArr, ...eArr]

            entries.forEach((e) => {
                const links = e.invitedUsersViaLinks?.filter((i) => { return i.emailArr }) || []
                const idx = links.findIndex((s) => { return s.emailArr?.indexOf(user.email) !== -1 })

                if (idx !== -1) {
                    shareArr = [...shareArr, e]
                }
            })

            shareArr?.forEach((s) => {
                let approvedCollectionGems = s?.gems?.filter((d) => {
                    return ((d?.author?.id === s?.author?.id) || (d?.isApproved === true && d?.isPending === false))
                })
                s.gems_count = approvedCollectionGems?.length
            })

            const finalResults = await this.prepareSubShareCollection(shareArr.filter((s) => {
                const index = shareArr.findIndex((h) => { return h.id === s.collection?.id })
                return index === -1
            }), user.id, user.email)

            ctx.send({ status: 200, data: finalResults })
        } catch (error) {
            ctx.send({ status: 400, message: error });
        }
    },

    prepareShareCollectionData(coll, mainData) {
        const arr = []
        let approvedCollectionGems = coll.gems.filter((data) => {
            if ((data?.author?.id === coll.author.id) || (data.isApproved === true && data.isPending === false)) {
                return data
            }
        })

        if (coll.parent_collection === null || coll.parent_collection === undefined || coll.parent_collection?.length === 0) {
            // const copyObj = coll.gems ? [...coll.gems] : []
            delete coll.parent_collection
            delete coll.gems
            arr.push({
                ...coll,
                bookmarksCount: approvedCollectionGems.length,
                folders: [],
                // bookmarks: copyObj
                // bookmarks: approvedCollectionGems
            })

            return arr
        }

        if (Array.isArray(coll.parent_collection)) {
            // const copyObj = coll.gems ? [...coll.gems] : []
            const obj = {
                ...coll,
                bookmarksCount: approvedCollectionGems.length,
                folders: [],
                // bookmarks: copyObj
                // bookmarks: approvedCollectionGems

            }
            coll.parent_collection?.forEach((p) => {
                const idx = mainData.findIndex((d) => { return d.id === p.id })
                if (idx !== -1) {
                    obj.folders = [...obj.folders, ...this.prepareShareCollectionData(mainData[idx], mainData)]
                }
            })
            delete obj.parent_collection
            delete obj.gems
            return [obj]
        }
    },

    async sharePublicCollection(ctx) {
        try {
            const { collectionId, page, perPage, isPagination } = ctx.request.query;

            const coll = await strapi.entityService.findOne('api::collection.collection', collectionId, {
                fields: ["id", "name", "slug", "description", "allowCopy", "avatar", "background", "comments_count", "iconLink", "is_sub_collection", "collectionPassword", "likes_count", "public_sub_collection", "save_count", "shares_count", "wallpaper", "showSidebar", "media_type", "allowUserSubmission", "showSocialIcons", "currentPublicLayout", "shortDescription", "otherSupportedMediaTypes", "siteConfig"],    
                populate: {
                    // parent_collection: {
                    //     fields: ["id", "name"],
                    // },
                    collection: {
                        fields: ["id", "name", "slug", "avatar", "sharable_links"],
                        // fields: ["id", "name", "slug", "description", "allowCopy", "avatar", "background", "comments_count", "iconLink", "is_sub_collection", "collectionPassword", "likes_count", "public_sub_collection", "save_count", "shares_count", "wallpaper", "showSidebar", "media_type", "allowUserSubmission", "showSocialIcons", "currentPublicLayout", "sharable_links"],
                        populate: {
                        //     gems: {
                        //         fields: ["id", "url", "slug", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "socialfeedAt", "entityObj", "expander", "platform", "isRead", "comments_count", "shares_count", "likes_count", "save_count", "highlightId", "isApproved", "isPending", "custom_fields_obj", "imageColor", "fileType"],
                        //         populate: {
                        //             author: {
                        //                 fields: ["id", "username", "firstname"]
                        //             }
                        //         }
                        //     },
                            author: {
                                fields: ["id", "username", "firstname", "profilePhoto"]
                            },
                        }
                    },
                    gems: {
                        fields: ["id", "url", "slug", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "socialfeedAt", "entityObj", "expander", "platform", "isRead", "comments_count", "shares_count", "likes_count", "save_count", "highlightId", "isApproved", "isPending", "custom_fields_obj", "imageColor", "fileType"],
                        populate: {
                            author: {
                                fields: ["id", "username", "firstname"]
                            }
                        }
                    },
                    author: {
                        fields: ["id", "username", "firstname", "profilePhoto"]
                    },
                    tags: {
                        fields: ["id", "tag", "slug", "avatar"]
                    }
                }
            });
            // const collection = await strapi.entityService.findMany('api::collection.collection', {
            //     filters: {
            //         author: coll.author.id
            //     },
            //     sort: { id: 'asc' },
            //     fields: ["id", "name", "avatar", "is_sub_collection", "media_type", "background"],
            //     populate: {
            //         parent_collection: {
            //             fields: ["id", "name"],
            //         },
            //         gems: {
            //             fields: ["id", "url", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "socialfeedAt", "entityObj", "expander", "platform", "isRead", "comments_count", "shares_count", "likes_count", "save_count", "highlightId", "isApproved", "isPending", "custom_fields_obj"],
            //             populate: {
            //                 author: {
            //                     fields: ["id", "username", "firstname"]
            //                 }
            //             }
            //         },
            //         author: {
            //             fields: ["id", "username", "firstname", "profilePhoto"]
            //         },
            //     }
            // });

            // let parentColl = collection.filter((d) => {
            //     return d.id === parseInt(collectionId)
            // })
            // const count = coll.gems?.length;

            let approvedCollectionGems = coll?.gems?.filter((data) => {
                if ((data?.author?.id === coll?.author?.id) || (data?.isApproved === true && data?.isPending === false)) {
                    return data
                }
            })
            const count = approvedCollectionGems?.length;
            let bookmarks = null
            if (isPagination === 'true') {
                const pages = page ? page : 0;
                const perPages = perPage ? perPage : 20;
                const pageNum = parseInt(pages);
                const perPagesNum = parseInt(perPages);
                const start = pageNum === 0 ? 0 : (pageNum - 1) * perPagesNum;
                const limit = start + perPagesNum;
                bookmarks = approvedCollectionGems?.slice(start, limit);
                // parentColl[0].gems = parentColl[0]?.gems?.slice(start, limit);
            }

            // let finalCollection = this.prepareShareCollectionData(parentColl[0], collection)
            // let approvedCollectionGems = coll?.gems?.filter((data) => {
            //     if ((data?.author?.id === coll?.author?.id) || (data?.isApproved === true && data?.isPending === false)) {
            //         return data
            //     }
            // })
            // const count = approvedCollectionGems?.length;

            const follower = await strapi.db.query("api::follower.follower").findOne({
                where: { userId: coll?.author?.id.toString() },
                populate: {
                    follower_users: {
                        select: ['id']
                    }
                }
            })

            coll.bookmarks = bookmarks
            delete coll?.gems
            // finalCollection[0].author.follower = follower?.follower_users
            // finalCollection[0].author.following = follower?.following_users
            coll.author.follower = follower?.follower_users
            coll.author.following = follower?.following_users
            const parentCollection = []
            if (coll?.collection && coll?.collection?.sharable_links) {
                // const parentCollectionData = await getPublicParentCollection(coll.collection)

                delete coll.collection.sharable_links
                parentCollection.push(coll.collection)
            }
            delete coll.collection;
            ctx.send({ status: 200, msg: 'Get public collection shared successfully', totalCount: count, data: [coll], parentCollection: parentCollection })

        } catch (error) {
            ctx.send({ status: 400, message: error.message });
        }
    },

    async sharePublicSubCollection(ctx) {
        try {
            const { collectionId, page, perPage, isPagination } = ctx.request.query;

            const coll = await strapi.entityService.findOne('api::collection.collection', collectionId, {
                populate: {
                    author: {
                        fields: ["id"]
                    }
                }
            });
            const collection = await strapi.entityService.findMany('api::collection.collection', {
                filters: {
                    author: coll.author.id
                },
                sort: { id: 'asc' },
                fields: ["id", "name", "slug", "avatar", "is_sub_collection", "media_type", "background"],
                populate: {
                    parent_collection: {
                        fields: ["id", "name", "slug"],
                    },
                    gems: {
                        fields: ["id", "slug", "isApproved", "isPending"],
                        // fields: ["id", "url", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "socialfeedAt", "entityObj", "expander", "platform", "isRead", "comments_count", "shares_count", "likes_count", "save_count", "highlightId", "isApproved", "isPending", "custom_fields_obj"],
                        populate: {
                            author: {
                                fields: ["id"]
                            }
                        }
                    },
                    author: {
                        fields: ["id", "username", "firstname", "profilePhoto"]
                    },
                }
            });

            let parentColl = collection.filter((d) => {
                return d.id === parseInt(collectionId)
            })
            const count = parentColl[0]?.gems?.length;
            // if (isPagination === 'true') {
            //     const pages = page ? page : '';
            //     const perPages = perPage ? perPage : 20;
            //     const pageNum = parseInt(pages);
            //     const perPagesNum = parseInt(perPages);
            //     const start = pageNum === 0 ? 0 : (pageNum - 1) * perPagesNum;
            //     const limit = start + perPagesNum;


            //     parentColl[0].gems = parentColl[0]?.gems?.slice(start, limit);
            // }

            let finalCollection = this.prepareShareCollectionData(parentColl[0], collection)

            const follower = await strapi.db.query("api::follower.follower").findOne({
                where: { userId: coll.author.id.toString() },
                populate: {
                    follower_users: {
                        select: ['id']
                    }
                }
            })

            finalCollection[0].author.follower = follower?.follower_users
            finalCollection[0].author.following = follower?.following_users


            ctx.send({ status: 200, msg: 'Get public collection shared successfully', totalCount: count, data: finalCollection })

        } catch (error) {
            ctx.send({ status: 400, message: error });
        }
    },

    async shareGemFiltersCountByMediaType(ctx) {
        try {
            const { collectionId } = ctx.params;

            const mediaTypes = [
                "Book",
                "Testimonial",
                "Link",
                "Screenshot",
                "Profile",
                "SocialFeed",
                "Highlight",
                "Code",
                "Article",
                "PDF",
                "Video",
                "Image",
                "Audio",
                "Product",
                "Ai Prompt",
                "Quote",
                "Note",
                "Movie",
                "Text Expander",
                "Citation",
                "App"
            ]

            const allGems = await strapi.entityService.findOne("api::collection.collection", collectionId, {
                fields: ["id", "name", "slug"],
                populate: {
                    gems: {
                        fields: ["media_type", "isApproved", "isPending"],
                        populate: {
                            author: {
                                fields: ["id", "username"]
                            }
                        }
                    },
                    author: {
                        fields: ["id", "username"]
                    }
                }
            })
            let approvedGems = allGems?.gems?.filter((data) => {
                if ((data?.author?.id === allGems?.author?.id) || (data?.isApproved === true && data?.isPending === false)) {
                    return data
                }
            })

            allGems.gems = approvedGems
            const typesObj = {}
            mediaTypes.forEach((type) => {
                typesObj[type] = allGems.gems.filter((g) => g.media_type === type).length
            })

            // // Preparing for favs
            // const filters = {
            //     $or: [
            //         {
            //             author: user.id,
            //             is_favourite: true
            //         },
            //         {
            //             like_users: user.id
            //         }
            //     ],
            //     collection_gems: { $not: null }
            // }
            // const gArr = await strapi.entityService.findOne("api::collection.collection", collectionId, {
            //     fields: ["id", "name"],
            //     populate: {
            //         gems: {
            //             filters,
            //             // fields: ["media_type"]
            //         }
            //     }
            // })

            // typesObj["Favourites"] = gArr.length

            return ctx.send(typesObj)

        } catch (error) {
            return ctx.send({ message: error });
        }
    },

    prepareChildTagsAndItsCount(childTags, tags, parent) {
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
                    folders: []
                }

                if (tObj.child_tags?.length > 0) {
                    obj.folders = this.prepareChildTagsAndItsCount(tObj.child_tags, tags, { id: tObj.id, tag: tObj.tag })
                }
                arr.push(obj)
            }
        }
        return arr
    },

    async getsharecollectionTagWiseGemCounts(ctx) {
        const { collectionId } = ctx.params;

        const collection = await strapi.entityService.findOne("api::collection.collection", collectionId, {
            fields: ["id", "name", "slug"],
            populate: {
                gems: {
                    populate: {
                        tags: {
                            fields: ["id", "tag", "slug", "tagColor", "is_sub_tag", "description", "avatar", "background", "media_type"],
                            populate: {
                                child_tags: {
                                    fields: ["id", "tag", "slug", "tagColor", "is_sub_tag", "description", "avatar", "background", "media_type"],
                                },
                                gems: {
                                    fields: ["id", "slug"],
                                    populate: {
                                        collection_gems: {
                                            fields: ["id"]
                                        },
                                    }
                                }
                            }
                        },
                        author: {
                            fields: ["id", "username"]
                        }
                    }
                },
                author: {
                    fields: ["id", "username"]
                }
            }
        })

        let approvedGems = collection?.gems?.filter((data) => {
            if ((data?.author?.id === collection?.author?.id) || (data?.isApproved === true && data?.isPending === false)) {
                return data
            }
        })

        collection.gems = approvedGems;
        const tagArr = collection.gems.map((g) => {
            return g.tags
        })

        const tagArray = tagArr.flat(Infinity)

        const arr = []
        tagArray.filter((t) => {
            const cIdx = arr.findIndex((c) => c.id === t.id)
            if (cIdx === -1) {
                arr.push(t)
            }
            return arr
        })

        const notTaggedGems = await strapi.entityService.findMany("api::gem.gem", {
            filters: {
                collection_gems: collectionId,
                tags: null,
            },
            populate: {
                author: {
                    fields: ["id", "username"]
                }
            }
        })
        let approvedNoTagGems = notTaggedGems?.filter((data) => {
            if ((data?.author?.id === collection?.author?.id) || (data?.isApproved === true && data?.isPending === false)) {
                return data
            }
        })

        const finalArr = [{
            id: "withoutTags",
            tag: "Without Tags",
            tagColor: "#000000",
            is_sub_tag: false,
            description: "",
            avatar: "",
            background: "",
            gems_count: approvedNoTagGems?.length,
            collection: null,
            folders: []
        }]

        const mainArr = arr.filter((t) => t.is_sub_tag === false)
        mainArr.forEach((m) => {
            const count = m?.gems?.filter((g) => {
                if (parseInt(g?.collection_gems?.id) === parseInt(collectionId)) {
                    return g
                }
            })?.length
            const obj = {
                id: m.id,
                tag: m.tag,
                tagColor: m.tagColor,
                is_sub_tag: m.is_sub_tag,
                description: m.description,
                avatar: m.avatar,
                background: m.background,
                gems_count: count || 0,
                media_type: m.media_type,
                folders: [],
                collection: null
            }
            if (m.child_tags?.length > 0) {
                obj.folders = this.prepareChildTagsAndItsCount(m.child_tags, arr, { id: m.id, tag: m.tag })
            }
            finalArr.push(obj)
        })

        return ctx.send(finalArr)
    },

    async shareCollectionToGroupViaEmail(ctx) {
        try {
            const u      = ctx.state.user;
            const { id } = ctx.state.user;
            const collid = ctx.params.collectionId;
            const jwt = getService('jwt').issue({ id: id });
            const { description,
                accessType,
                emails, groupId, groupName } = ctx.request.body;
            let invitedUsersArr = [];
            let index
            let expiryDate
            let configLimit
            let permissions
            const uniqueToken = uuidv4();
            const link = `${process.env.REDIRECT_URI}/check-user?token=${uniqueToken}&collectionId=${collid}&groupId=${groupId}`;

            const collection = await strapi.entityService.findOne('api::collection.collection', collid, {
                populate: '*'
            });
            
            const userService = getService('users-permissions');
            const message     = await userService.template(SHARED_EMAIL, {
                USER: { name: u.firstname && u.lastname ? `${u.firstname} ${u.lastname}` : u.username },
                CODE: collection.name,
                URL: link
            });
            const subject     = await userService.template("You just received a collection!📦", {
                USER: u,
            });
            for (const email of emails) {
                strapi
                    .plugin('email')
                    .service('email')
                    .send({
                        to: email,
                        from: `CurateIt <${process.env.AWS_EMAIL_FROM}>`,
                        replyTo: process.env.AWS_EMAIL_REPLY_TO,
                        subject,
                        text: message,
                        html: message,
                    });
                // strapi.plugins['email'].services.email.send({
                //     to: email,
                //     from: 'noreply@curateit.com',
                //     subject: 'Share Collection',
                //     html: `<div><p>${description}</p> <a href=${link}>Click Here</a></div>`,
                // })
                // const object = {
                //     action: "Shared",
                //     module: "Collection",
                //     actionType: "Collection",
                //     count: 1,
                //     author: { id: id, username: username },
                //     collection_info: { id: collectionData.id, name: collectionData.name }
                // }
                // createActivity(object, jwt);  
            }

            if (collection.invitedUsersViaMail != null) invitedUsersArr.push(...collection.invitedUsersViaMail);
            index = invitedUsersArr.findIndex(d => d.id === parseInt(groupId) && d.isGroupShare === true);
            expiryDate = moment(new Date()).add(1, 'years').format("DD/MM/YYYY")
            // configLimit = await strapi.entityService.findMany('api::config-limit.config-limit')
            configLimit = await strapi.db.query("api::config-limit.config-limit").findOne({
                where: { allowViews: { $notNull: true }, allowsDownload: { $notNull: true } }
            })

            permissions = await accessPermissions(accessType);

            const group = await strapi.entityService.findOne("api::group.group", groupId, {
                fields: ["id", "name", "members"]
            })
            group?.members?.map(member => {
                return member.accessType = accessType
            })

            const idx = group?.members?.findIndex((m) => m.id === id)
            if (idx !== -1) {
                group?.members?.splice(idx, 1)
            }

            const invitedUsersObj = {
                id: groupId,
                group: groupName,
                members: group?.members,
                link: link,
                token: uniqueToken,
                accessType: accessType,
                password: null,
                isSecure: false,
                isExpire: false,
                permissions,
                expiryDate: expiryDate,
                allowViews: configLimit?.allowViews,
                allowsDownload: configLimit?.allowsDownload,
                totalDownload: 0,
                linkClick: 0,
                isAccept: false,
                isGroupShare: true
            };
            index === -1 ? invitedUsersArr.push(invitedUsersObj) : invitedUsersArr[index] = invitedUsersObj;
            strapi.entityService.update('api::collection.collection', collid, {
                data: {
                    invitedUsersViaMail: invitedUsersArr,
                    isShareCollection: true,
                    isShared: true
                }
            });
            shareInviteTopToBottom(collid, invitedUsersObj, false, true, groupId)

            return { status: 200, message: "email send" };

        } catch (error) {
            ctx.send({ status: 400, error: error.message })
        }
    },

    async getShareCollecctionToGroup(ctx) {
        try {
            const { id, email } = ctx.state.user;
            const { collectionId } = ctx.params;
            const { groupId } = ctx.request.query;

            const collection = await strapi.entityService.findOne('api::collection.collection', collectionId, {
                populate: {
                    author: {
                        fields: ["id"]
                    }
                }
            });

            const invitedUser = collection.invitedUsersViaMail;
            let objIndex = invitedUser.findIndex((d) => d.id === parseInt(groupId) && d.isGroupShare === true)
            if (objIndex === -1) return ctx.send({ status: 400, msg: 'No group exist' });

            const inviteEmail = invitedUser[objIndex]?.members?.findIndex((d) => d.email === email)
            if (inviteEmail === -1) return ctx.send({ status: 400, msg: 'No user exist' });

            const expiryDate = invitedUser[objIndex]?.expiryDate
            const allowsDownload = invitedUser[objIndex]?.allowsDownload
            const allowViews = invitedUser[objIndex]?.allowViews
            const accessType = invitedUser[objIndex]?.accessType
            const creationDate = moment(new Date()).format("DD/MM/YYYY")

            if (moment(expiryDate, "DD/MM/YYYY").isAfter(moment(creationDate, "DD/MM/YYYY")) && allowViews >= invitedUser[objIndex]?.linkClick && allowsDownload >= invitedUser[objIndex]?.totalDownload && !invitedUser[objIndex]?.isExpire) {

                if (!invitedUser[objIndex].isAccept) {
                    invitedUser[objIndex].isAccept = true;
                }
                invitedUser[objIndex].linkClick = invitedUser[objIndex].linkClick + 1;
                strapi.entityService.update('api::collection.collection', collectionId, {
                    data: {
                        invitedUsersViaMail: invitedUser
                    }
                });

                const requireColl = await strapi.entityService.findMany('api::collection.collection', {
                    filters: {
                        author: collection.author.id
                    },
                    sort: { id: 'asc' },
                    fields: ["id", "name", "slug", "avatar", "iconLink", "comments_count", "shares_count", "likes_count", "save_count", "isShareCollection"],
                    populate: {
                        parent_collection: {
                            fields: ["id", "slug", "name", "comments_count", "shares_count", "likes_count", "save_count"],
                        },
                        gems: {
                            fields: ["id", "url", "slug", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "socialfeedAt", "entityObj", "expander", "platform", "isRead", "comments_count", "shares_count", "likes_count", "save_count", "highlightId"]
                        },
                        tags: {
                            fields: ["id", "tag", "slug"]
                        }
                    }
                });

                const parentColl = requireColl.filter((d) => {
                    return d.id === parseInt(collectionId)
                })
                const finalCollection = prepareRequireCollectionData(parentColl[0], requireColl)

                return ctx.send({
                    status: 200, msg: "Shared collection details is valid ", accessType, isShareCollection: collection.isShareCollection, data: finalCollection
                });
            }

            ctx.send({ status: 400, msg: 'Shared collection details is expired. Please contact owner.' });

        } catch (error) {
            ctx.send({ status: 400, error: error.message })
        }
    },

    async setSecurityOnGroupLink(ctx) {
        try {
            const {
                accessType,
                allowsDownload,
                allowViews,
                expiryDate,
                members
            } = ctx.request.body;

            const { collectionId } = ctx.params;
            const { token, userId } = ctx.request.query;
            const collection = await strapi.entityService.findOne('api::collection.collection', collectionId);
            const permissions = await accessPermissions(accessType);

            let invitedUsers = collection.invitedUsersViaMail;
            const index = invitedUsers.findIndex(d => d.token === token);

            if (userId !== "undefined" && userId !== undefined && userId !== null && userId !== "" && userId) {
                const members = invitedUsers[index].members
                const memberIndex = members.findIndex(d => parseInt(d.id) === parseInt(userId))
                if (memberIndex === -1) return ctx.send({ status: 400, msg: 'No user exist' });
                members[memberIndex].accessType = accessType;
                await strapi.entityService.update('api::collection.collection', collectionId, {
                    data: {
                        invitedUsersViaMail: invitedUsers
                    }
                })
                return ctx.send({ status: 200, msg: 'Update successfully.' })
            }

            if (index !== -1) {
                invitedUsers[index].accessType = accessType;
                invitedUsers[index].allowViews = allowViews;
                invitedUsers[index].allowsDownload = allowsDownload;
                invitedUsers[index].expiryDate = expiryDate;
                invitedUsers[index].permissions = permissions;
                invitedUsers[index].members = JSON.parse(members).map((m) => {
                    return { ...m, accessType }
                })
                // invitedUsers[index].members.forEach((m) => {
                //     return m.accessType = accessType
                // })

                await strapi.entityService.update('api::collection.collection', collectionId, {
                    data: {
                        invitedUsersViaMail: invitedUsers
                    }
                })
            }


            ctx.send({ status: 200, msg: 'Update successfully.' })

        } catch (error) {
            ctx.send({
                status: 400, message: error.message
            })
        }
    },

    async isPublicCollection (ctx) {
        const { user }          = ctx.state
        const { collectionId }  = ctx.params;
        return ctx.send(await strapi.service('api::collection.checks').checkIsRootPublic(parseInt(collectionId), user))
    },

    async isFollowerCollection (ctx) {
        const { user }          = ctx.state
        const { collectionId }  = ctx.params;
        return ctx.send(await strapi.service('api::collection.checks').checkIsRootFollowed(parseInt(collectionId), user))
    },

    async isPublicGem (ctx) {
        const { user }  = ctx.state
        const { gemId } = ctx.params
        const val       = parseInt(gemId)
        const gem       = await strapi.entityService.findOne('api::gem.gem', val, {
            populate: {
                collection_gems: {
                    fields: ["id", "sharable_links", "follower_users"]
                },
                tags: {
                    fields: ["id", "sharable_links"]
                }
            }
        })

        let isPublic = false

        if (user && JSON.stringify(gem.collection_gems?.follower_users)?.includes(user.email)) {
            isPublic = true
        }

        if (gem.collection_gems?.sharable_links && gem.collection_gems?.sharable_links !== "") {
            isPublic = true
        }

        const idx = gem.tags.findIndex((t) => t.sharable_links && t.sharable_links !== "")
        if (idx !== -1) {
            isPublic = true
        }

        if (isPublic) return ctx.send(isPublic)

        isPublic = await strapi.service('api::collection.checks').checkIsRootPublic(gem.collection_gems?.id, user)
        if (!isPublic) {
            for (const tag of gem.tags) {
                isPublic = await strapi.service('api::tag.checks').checkIsRootPublic(tag.id, user)
                if (isPublic) {
                    break
                }
            }
        }
        return ctx.send(isPublic)
    },

    async removeShareCollection(ctx) {
        try {
            const { user } = ctx.state;
            const { collectionId } = ctx.params;

            const collection = await strapi.entityService.findOne("api::collection.collection", collectionId, {
                fields: ["id", "name", "invitedUsersViaMail", "invitedUsersViaLinks"]
            })

            let invitedUsers = collection?.invitedUsersViaMail
            const index = invitedUsers.findIndex((d) => (parseInt(d?.id) === parseInt(user?.id) && !d?.isGroupShare))
            if (index === -1) {
                const grpIndex = invitedUsers.findIndex((d) => (d?.members && d?.members?.findIndex((m) => parseInt(m?.id) === parseInt(user?.id)) !== -1))
                if (grpIndex === -1) return ctx.send({ status: 400, msg: 'No user exist' });
                const memberIndex = invitedUsers[grpIndex]?.members?.findIndex((m) => parseInt(m?.id) === parseInt(user?.id))

                if (memberIndex === -1) return ctx.send({ status: 400, msg: 'No user exist' });
                invitedUsers[grpIndex]?.members?.splice(memberIndex, 1)
            } else {
                invitedUsers.splice(index, 1)
            }

            await strapi.entityService.update('api::collection.collection', collectionId, {
                data: {
                    invitedUsersViaMail: invitedUsers
                }
            })

            return ctx.send({ status: 200, message: "Collection remove successfully" });

        } catch (error) {
            return ctx.send({ status: 400, message: error.message });
        }
    }
})) 