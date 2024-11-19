'use strict';

const { getService } = require('../../../extensions/users-permissions/utils');
const { createActivity } = require('../../../../utils');
const { FOLLOWER_EMAIL } = require('../../../../emails/follower');
const { followedByMeCollectionData, prepareFollowCollectionData } = require('../services/follower-service');

/**
 * follower controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::follower.follower', ({ strapi }) => ({
    async followingUserColl(ctx) {
        try {
            const { id, email, username } = ctx.state.user;
            const { hierarchyLevel, followerUserId, collectionId } = ctx.request.body;
            const jwt = getService('jwt').issue({ id: id });
            if (!hierarchyLevel) {
                return ctx.send({ msg: 'Invalid hierarchy level' }, 400);
            }
            let userExist;
            let followingUserDetails = null
            if (followerUserId && hierarchyLevel.toLowerCase() === 'user') {

                /* Checking followerUser exist or not ? */
                const followerUserDetail = await strapi.query('plugin::users-permissions.user').findOne({
                    where: {
                        id: followerUserId
                    },
                })
                followingUserDetails = followerUserDetail
                if (!followerUserDetail) {
                    return ctx.send({ msg: 'Follower user not exist' }, 400);
                }

                // Checking follower recs is exist or not ?
                const followerUser = await strapi.db.query('api::follower.follower').findOne({
                    where: {
                        userId: followerUserId
                    },
                    populate: true
                })

                // const followerColls = await strapi.db.query('api::collection.collection').findMany({
                //     where: {
                //         author: followerUserId
                //     }
                // })
                // const collIds = followerColls.map((f_colls => f_colls.id));

                // Updating follower users recs
                if (!followerUser) {

                    await strapi.db.query('api::follower.follower').create({
                        data: {
                            userId: followerUserId,
                            follower_users: id,
                            publishedAt: new Date().toISOString()
                        }
                    })

                    /* logs data for update hightlighed text  */
                    // await strapi.entityService.create("api::activity-log.activity-log", {
                    //     data: {
                    //         action: "Created",
                    //         module: "Users",
                    //         actionType: "Follow",
                    //         author: id,
                    //         publishedAt: new Date().toISOString(),
                    //     },
                    // });
                    // const object = {
                    //     action: "Created",
                    //     module: "Users",
                    //     actionType: "Follow",
                    //     count: 1,
                    //     author: { id, username },
                    // }
                    // createActivity(object, jwt);
                    // await axios.post(
                    //     `${process.env.MONGODB_URL}/api/activitylogs`,
                    //     {
                    //         action: "Created",
                    //         module: "Users",
                    //         actionType: "Follow",
                    //         count: 1,
                    //         author: { id, username },
                    //     },
                    //     {
                    //         headers: {
                    //             Authorization: `Bearer ${jwt}`
                    //         },
                    //     }
                    // )


                } else {
                    // checking follower users is exist or not ? 
                    userExist = followerUser?.follower_users.find(f_users => (parseInt(f_users.id) === parseInt(id)));

                    if (userExist) {
                        return ctx.send({ msg: 'This users already followed' });
                    }

                    await strapi.db.query('api::follower.follower').update({
                        where: {
                            userId: followerUserId
                        },
                        data: {
                            follower_users: followerUser?.follower_users ? [...followerUser.follower_users, id] : id
                        }
                    })

                    // for (const f_colls of followerColls) {
                    //     const { follower_users } = f_colls;

                    //    await strapi.db.query('api::collection.collection').update({
                    //         where: {
                    //             id: f_colls.id
                    //         },
                    //         data: {
                    //             follower_users: follower_users ? [...follower_users, { id, username, email }] : [{ id, username, email }]
                    //         }
                    //     })
                    // }

                }

                // Updating following users recs 
                const followingUser = await strapi.db.query('api::follower.follower').findOne({
                    where: {
                        userId: id
                    }
                })

                const followingUserObj = {
                    id: followerUserDetail.id,
                    username: followerUserDetail.username,
                    email: followerUserDetail.email
                }

                if (!followingUser) {
                    await strapi.db.query('api::follower.follower').create({
                        data: {
                            userId: id,
                            following_users: [followingUserObj],
                            publishedAt: new Date().toISOString()
                        }
                    })
                } else {
                    await strapi.db.query('api::follower.follower').update({
                        where: {
                            userId: id
                        },
                        data: {
                            following_users: followingUser?.following_users ? [...followingUser.following_users, followingUserObj] : [followingUserObj]
                        }
                    })
                }

                /* logs data for update hightlighed text  */
                // await strapi.entityService.create("api::activity-log.activity-log", {
                //     data: {
                //         action: "Created",
                //         module: "Users",
                //         actionType: "Follow",
                //         author: id,
                //         publishedAt: new Date().toISOString(),
                //     },
                // });
                const object = {
                    action: "Created",
                    module: "Users",
                    actionType: "Follow",
                    count: 1,
                    author: { id, username },
                }
                createActivity(object, jwt);
                // await axios.post(
                //     `${process.env.MONGODB_URL}/api/activitylogs`,
                //     {
                //         action: "Created",
                //         module: "Users",
                //         actionType: "Follow",
                //         count: 1,
                //         author: { id, username },
                //     },
                //     {
                //         headers: {
                //             Authorization: `Bearer ${jwt}`
                //         },
                //     }
                // )


            } else {
                /* cheking collectionId available or not ? */
                if (!collectionId) return ctx.send({ msg: 'No collectionId is present' }, 400);


                /* Directly following collections which can be root or sub_folder  */
                const originalColls = await strapi.entityService.findOne('api::collection.collection', collectionId, {
                    populate: {
                        author: {
                            fields: ["id", "username", "email"]
                        },
                        collection: {
                            fields: ["id", "name", "slug"]
                        },
                        parent_collection: {
                            fields: ["id", "name", "slug"]
                        }
                    }
                })

                followingUserDetails = originalColls?.author

                if (!originalColls) return ctx.send({ msg: 'No collection exist' }, 400);

                if (originalColls?.follower_users) {
                    userExist = originalColls?.follower_users.find(f_users => (parseInt(f_users.id) === parseInt(id)));
                }
                if (userExist) return ctx.send({ msg: 'This users already followed' });


                await strapi.db.query('api::collection.collection').update({
                    where: {
                        id: collectionId
                    },
                    data: {
                        follower_users: originalColls?.follower_users ? [...originalColls?.follower_users, { id, username, email }] : [{ id, username, email }]
                    }
                })

                // if (originalColls?.parent_collection && originalColls?.parent_collection.length > 0) {
                //     this.followerCollsFromToptoBottom(originalColls.parent_collection, { id, username, email }, 'follow');
                // }

                /* logs data for update hightlighed text  */
                // await strapi.entityService.create("api::activity-log.activity-log", {
                //     data: {
                //         action: "Created",
                //         module: "Users",
                //         actionType: "Follow",
                //         author: id,
                //         publishedAt: new Date().toISOString(),
                //     },
                // });
                const object = {
                    action: "Created",
                    module: "Collection",
                    actionType: "Follow",
                    count: 1,
                    author: { id, username },
                }
                createActivity(object, jwt);
                // await axios.post(
                //     `${process.env.MONGODB_URL}/api/activitylogs`,
                //     {
                //         action: "Created",
                //         module: "Users",
                //         actionType: "Follow",
                //         count: 1,
                //         author: { id, username },
                //     },
                //     {
                //         headers: {
                //             Authorization: `Bearer ${jwt}`
                //         },
                //     }
                // )

            }

            if (followingUserDetails?.email) {
                const link = `${process.env.REDIRECT_URI}/u/${username}`;
                const userService = getService('users-permissions');
                const message = await userService.template(FOLLOWER_EMAIL, {
                    URL: link
                });
                const subject = await userService.template("🔔 Ding, Ding! A New Follower Just Arrived!", {});
                strapi
                    .plugin('email')
                    .service('email')
                    .send({
                        to: followingUserDetails.email,
                        from: `CurateIt <${process.env.AWS_EMAIL_FROM}>`,
                        replyTo: process.env.AWS_EMAIL_REPLY_TO,
                        subject,
                        text: message,
                        html: message,
                    });
            }
            ctx.send({ status: 200, msg: 'users followed successfully' });
        } catch (err) {
            console.log("error occrued :", err);
            ctx.send({ message: err }, 400);
        }
    },
    async unFollowingUserColl(ctx) {
        try {
            const { id, username } = ctx.state.user;
            const { hierarchyLevel, followerUserId, collectionId } = ctx.request.body;
            const jwt = getService('jwt').issue({ id: id });
            /* checking  hierachyLevel exist or not ?  */
            if (!hierarchyLevel) return ctx.send({ msg: 'Invalid hierarchy Level' }, 400);
            let updatedFollowerUsers = [];
            if (followerUserId && hierarchyLevel.toLowerCase() === 'user') {

                // Checking follower recs is exist or not ?
                const followerUser = await strapi.db.query('api::follower.follower').findOne({
                    where: {
                        userId: followerUserId
                    },
                    populate: true
                })
                if (!followerUser || !followerUser?.follower_users) return ctx.send({ msg: 'No following/follower user exist' }, 400);

                /* Before unfollowed checking users exist or not ? */
                const userExist = followerUser.follower_users.find(f_users => (parseInt(f_users.id) === parseInt(id)));
                if (!userExist) return ctx.send({ msg: 'User already unfollowed' }, 400);

                /* unfollower user */
                updatedFollowerUsers = followerUser.follower_users.filter(f_users => (parseInt(f_users.id) !== parseInt(id)));
                await strapi.db.query('api::follower.follower').update({
                    where: {
                        userId: followerUserId
                    },
                    data: {
                        follower_users: updatedFollowerUsers
                    }
                })

                /* unfollowing user */
                const followingUser = await strapi.db.query('api::follower.follower').findOne({
                    where: {
                        userId: id
                    }
                })
                const updatedFollowingUsers = followingUser?.following_users.filter(f_users => (parseInt(f_users.id) !== parseInt(followerUserId)));
                await strapi.db.query('api::follower.follower').update({
                    where: {
                        userId: id
                    },
                    data: {
                        following_users: updatedFollowingUsers
                    }
                })

                /* unfollowing colls from user level */
                // const followerColls = await strapi.db.query('api::collection.collection').findMany({
                //     where: {
                //         author: followerUserId
                //     }
                // })
                // for (const f_colls of followerColls) {
                //     const { follower_users } = f_colls;
                //     if (follower_users) {
                //         const updatedFollowerColls = follower_users.filter(f_users => (parseInt(f_users.id) !== parseInt(id)));
                //        await strapi.db.query("api::collection.collection").update({
                //             where: {
                //                 id: f_colls.id
                //             },
                //             data: {
                //                 follower_users: updatedFollowerColls
                //             }
                //         })
                //     }
                // }

                /* logs data for update hightlighed text  */
                // await strapi.entityService.create("api::activity-log.activity-log", {
                //     data: {
                //         action: "Created",
                //         module: "Users",
                //         actionType: "Unfollow",
                //         author: id,
                //         publishedAt: new Date().toISOString(),
                //     },
                // });
                const object = {
                    action: "Created",
                    module: "Users",
                    actionType: "Unfollow",
                    count: 1,
                    author: { id, username },
                }
                createActivity(object, jwt);
                // await axios.post(
                //     `${process.env.MONGODB_URL}/api/activitylogs`,
                //     {
                //         action: "Created",
                //         module: "Users",
                //         actionType: "Unfollow",
                //         count: 1,
                //         author: { id, username },
                //     },
                //     {
                //         headers: {
                //             Authorization: `Bearer ${jwt}`
                //         },
                //     }
                // )

            } else {

                /* Checking collectionId exist or not ? */
                if (!collectionId) return ctx.send({ msg: 'No collectionId is exist' }, 400);

                /* Directly unfollowing collections which can be root or sub_folder  */
                const originalColls = await strapi.entityService.findOne('api::collection.collection', collectionId, {
                    populate: {
                        author: {
                            fields: ["id", "username", "email"]
                        },
                        collection: {
                            fields: ["id", "name", "slug", "comments_count", "shares_count", "likes_count", "save_count"]
                        },
                        parent_collection: {
                            fields: ["id", "name", "slug", "comments_count", "shares_count", "likes_count", "save_count"]
                        }
                    }
                })

                if (!originalColls || !originalColls?.follower_users) return ctx.send({ msg: 'No collection exist' }, 400);

                /* Before unfollowed checking users exist or not ? */
                const userExist = originalColls.follower_users.find(f_users => (parseInt(f_users.id) === parseInt(id)));
                if (!userExist) return ctx.send({ msg: 'User already unfollowed' }, 400);

                if (originalColls?.follower_users) {
                    updatedFollowerUsers = originalColls?.follower_users.filter(f_users => (parseInt(f_users.id) !== parseInt(id)));
                    await strapi.db.query('api::collection.collection').update({
                        where: {
                            id: collectionId
                        },
                        data: {
                            follower_users: updatedFollowerUsers
                        }
                    })
                }

                // if (originalColls?.parent_collection && originalColls?.parent_collection.length > 0) {
                //     this.followerCollsFromToptoBottom(originalColls.parent_collection, id, 'unfollow');
                // }
                /* logs data for update hightlighed text  */
                // await strapi.entityService.create("api::activity-log.activity-log", {
                //     data: {
                //         action: "Created",
                //         module: "Users",
                //         actionType: "Unfollow",
                //         author: id,
                //         publishedAt: new Date().toISOString(),
                //     },
                // });
                const object = {
                    action: "Created",
                    module: "Collection",
                    actionType: "Unfollow",
                    count: 1,
                    author: { id, username },
                }
                createActivity(object, jwt);
                // await axios.post(
                //     `${process.env.MONGODB_URL}/api/activitylogs`,
                //     {
                //         action: "Created",
                //         module: "Users",
                //         actionType: "Unfollow",
                //         count: 1,
                //         author: { id, username },
                //     },
                //     {
                //         headers: {
                //             Authorization: `Bearer ${jwt}`
                //         },
                //     }
                // )
            }
            ctx.send({ status: 200, msg: 'User unfollowed successfully' });

        } catch (err) {
            console.log("error occrured :", err);
            ctx.send({ message: err }, 400)
        }
    },
    async followerFollowingList(ctx) {
        try {
            const user = ctx.state.user;

            if (!user) return ctx.send({ msg: 'No user found' }, 400);

            /* Fetching follower/following user list  */
            const followerData = await strapi.db.query('api::follower.follower').findOne({
                where: {
                    userId: user.id
                },
                select: ["id", "userId", "following_users"],
                populate: {
                    follower_users: {
                        select: ["id", "username", "email"]
                    }
                }

            })
            ctx.send({ msg: 'Get Follower/Following details successfully ', data: followerData });
        } catch (err) {
            console.log("error occured :", err);
            ctx.send({ message: err }, 400);
        }
    },
    // async followerCollsFromToptoBottom(parantColls, user, type) {

    //     if (parantColls && parantColls?.length > 0) {
    //         for (const p_colls of parantColls) {
    //             const subColls = await strapi.entityService.findOne('api::collection.collection', p_colls.id, {
    //                 populate: {
    //                     author: {
    //                         fields: ["id", "username", "email"]
    //                     },
    //                     collection: {
    //                         fields: ["id", "name", "slug", "comments_count", "shares_count", "likes_count", "save_count"]
    //                     },
    //                     parent_collection: {
    //                         fields: ["id", "name", "slug", "comments_count", "shares_count", "likes_count", "save_count"]
    //                     }
    //                 }
    //             });

    //             const { parent_collection, follower_users } = subColls;
    //             let userExist;
    //             let updatedFollowerUsers;
    //             if (type === 'follow') {
    //                 userExist = follower_users ? follower_users.find(f_colls => (parseInt(f_colls.id) === parseInt(user.id))) : null;
    //             } else {
    //                 updatedFollowerUsers = follower_users ? follower_users.filter(f_colls => (parseInt(f_colls.id) !== parseInt(user))) : null;
    //             }


    //             if (parent_collection && parent_collection.length > 0) {
    //                 this.followerCollsFromToptoBottom(parent_collection, user, type);

    //                 if (type === 'follow' && !userExist) {
    //                     await strapi.db.query('api::collection.collection').update({
    //                         where: {
    //                             id: p_colls.id
    //                         },
    //                         data: {
    //                             follower_users: subColls?.follower_users ? [...subColls?.follower_users, user] : [user]
    //                         }
    //                     })
    //                 } else if (type === 'unfollow' && updatedFollowerUsers) {
    //                     await strapi.db.query('api::collection.collection').update({
    //                         where: {
    //                             id: p_colls.id
    //                         },
    //                         data: {
    //                             follower_users: updatedFollowerUsers
    //                         }
    //                     })
    //                 }
    //             }

    //             if (type === 'follow' && !userExist) {
    //                 await strapi.db.query('api::collection.collection').update({
    //                     where: {
    //                         id: p_colls.id
    //                     },
    //                     data: {
    //                         follower_users: subColls?.follower_users ? [...subColls?.follower_users, user] : [user]
    //                     }
    //                 })
    //             } else if (type === 'unfollow' && updatedFollowerUsers) {
    //                 await strapi.db.query('api::collection.collection').update({
    //                     where: {
    //                         id: p_colls.id
    //                     },
    //                     data: {
    //                         follower_users: updatedFollowerUsers
    //                     }
    //                 })
    //             }

    //         }
    //     }

    // },

    async followByMeCollection(ctx) {
        try {
            const { id, email } = ctx.state.user;

            const collections = await strapi.entityService.findMany("api::collection.collection", {
                filters: {
                    follower_users: {
                        $notNull: true,
                        $containsi: email
                    },
                },
                fields: ["id", "name", "slug", "avatar", "iconLink", "comments_count", "shares_count", "publicSubCollection", "likes_count", "save_count", "isShareCollection", "invitedUsersViaMail", "invitedUsersViaLinks", "is_sub_collection", "background"],
                populate: {
                    author: {
                        fields: ["id", "username"]
                    },
                    collection: {
                        fields: ["id", "name", "slug"],
                        populate: {
                            author: {
                                fields: ["id", "username"]
                            },
                        }
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
                        //  "url", "slug", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "socialfeedAt", "entityObj", "expander", "platform", "isRead", "comments_count", "shares_count", "likes_count", "save_count", "highlightId", 
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

            const count = collections.length;
            // const followCollections = await followedByMeCollectionData(collections)
            
            const arr = []
            for (const collection of collections) {
                const c = await prepareFollowCollectionData(collection, collection.parent_collection)
                arr.push(c)
            }

            // const finalResult = arr.filter((f) => { return f.collection === null })
            const finalResult = arr.filter((f) => { return collections.findIndex((c) => { return c.id === f.id }) !== -1 })

            ctx.send({ status: 200, count, data: finalResult })

        } catch (error) {
            ctx.send({ status: 400, error: error.message })
        }
    }
}));
