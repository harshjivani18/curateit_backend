'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { v4: uuidv4 } = require("uuid");
const { accessTagPermissions, createActivity, updatePlanService } = require('../../../../utils');
const moment = require("moment");
const bcrypt = require('bcrypt')
const { getService } = require('../../../extensions/users-permissions/utils');
const { default: slugify } = require('slugify');
const { subTagIds } = require('../services/tag-service');
const { shareInviteTagTopToBottom, removeShareChildLevelTag } = require('../services/share-tag');
const { populate } = require('dotenv');

module.exports = createCoreController('api::tag.tag', ({ strapi }) => ({

    async updateTagData(obj, viaEmail) {
        // const jwt = getService('jwt').issue({ id: user.id });
        const tagData = await strapi.entityService.findOne('api::tag.tag', obj.tagId, {
            populate: '*'
        });

        const expiryDate = moment(new Date()).add(1, 'years').format("DD/MM/YYYY");
        // const configLimit = await strapi.entityService.findMany('api::config-limit.config-limit')
        const configLimit = await strapi.db.query("api::config-limit.config-limit").findOne({
            where: { allowViews: { $notNull: true }, allowsDownload: { $notNull: true } }
        })
        const permissions = await accessTagPermissions(obj.accessType);
        let invitedUsersArr = [];
        let invitedLinksArr = [];
        if (viaEmail) {
            const userData = await strapi.db.query('plugin::users-permissions.user').findOne({
                where: { email: obj.email }
            });

            const userId = !userData ? null : userData.id;
            const userName = !userData ? null : userData.username;

            if (tagData.invitedUsersViaMail != null) invitedUsersArr.push(...tagData.invitedUsersViaMail);
            const index = invitedUsersArr.findIndex(d => d.emailId === obj.email);

            const invitedUsersObj = {
                id: userId,
                emailId: obj.email,
                userName,
                link: obj.link,
                token: obj.uniqueToken,
                accessType: obj.accessType,
                password: null,
                isSecure: false,
                isExpire: false,
                permissions,
                expiryDate,
                allowViews: configLimit?.allowViews,
                allowsDownload: configLimit?.allowsDownload,
                totalDownload: 0,
                linkClick: 0,
                isAccept: false,
            };

            index === -1 ? invitedUsersArr.push(invitedUsersObj) : invitedUsersArr[index] = invitedUsersObj;

            if (tagData?.child_tags && tagData?.child_tags?.length > 0) {
                shareInviteTagTopToBottom(tagData.child_tags, invitedUsersObj)
            }

        } else {
            if (tagData.invitedUsersViaLink != null) invitedLinksArr.push(...tagData.invitedUsersViaLink);

            const invitedLinksObj = {
                id: obj.uniqueToken,
                url: obj.link,
                accessType: obj.accessType,
                password: null,
                isSecure: false,
                isExpire: false,
                permissions,
                expiryDate: expiryDate,
                allowViews: configLimit?.allowViews,
                allowsDownload: configLimit?.allowsDownload,
                totalDownload: 0,
                linkClick: 0,
                emailArr: [],
                allowAllMail: obj.allowEmail ? obj.allowEmail : "all"
            };
            invitedLinksArr.push(invitedLinksObj);
        }

        const data = viaEmail ? {
            invitedUsersViaMail: invitedUsersArr,
            isShared: true
        } : { invitedUsersViaLink: invitedLinksArr, isShared: true }
        await strapi.entityService.update('api::tag.tag', obj.tagId, {
            data
        });

        // const object = {
        //     action: "Shared",
        //     module: "Tag",
        //     actionType: "Tag",
        //     count: 1,
        //     author: { id: obj.user.id, username: obj.user.username },
        //     collection_info: { id: updateTagData.id, name: updateTagData.tag }
        // }
        // createActivity(object, jwt);

        return "Success"
    },

    prepareRequireTag(tag, mainData) {
        const arr = []
        if (tag.child_tags === null || tag.child_tags === undefined || tag.child_tags?.length === 0) {
            const copyObj = tag.gems ? [...tag.gems] : []
            delete tag.child_tags
            delete tag.gems
            tag.author = (tag.users.length > 0) ? tag.users[0] : null
            delete tag.users
            arr.push({
                ...tag,
                tags: [],
                bookmarks: copyObj
            })

            return arr
        }

        if (Array.isArray(tag.child_tags)) {
            const copyObj = tag.gems ? [...tag.gems] : []
            const obj = {
                ...tag,
                tags: [],
                bookmarks: copyObj
            }
            tag.child_tags?.forEach((p) => {
                const idx = mainData.findIndex((d) => { return d.id === p.id })
                if (idx !== -1) {
                    obj.tags = [...obj.tags, ...this.prepareRequireTag(mainData[idx], mainData)]
                }
            })
            delete obj.child_tags
            delete obj.gems
            return [obj]
        }
    },

    async shareTagViaEmail(ctx) {
        try {
            const { user } = ctx.state;
            const { tagId } = ctx.params;
            const { description,
                accessType,
                email, tagName } = ctx.request.body;

            await strapi.service('api::team.team').updateCurrentSharedCollectionsOrTags({
                email,
                author: user.id
            }, tagId, "tags");

            const uniqueToken = uuidv4();
            const link = `${process.env.REDIRECT_URI}/check-user-tags?token=${uniqueToken}&tagId=${tagId}&email=${email}`;
            // const link = `${process.env.REDIRECT_URI}/u/@${user.username.replace(" ", "")}/c/${tagId}/${slugify(tagName || "", { lower: true, remove: /[0-9&,+()$~%.'":*?<>{}/\/]/g })}?public=true`;

            await strapi.plugins['email'].services.email.send({
                to: email,
                from: 'noreply@curateit.com',
                subject: 'Share Tag',
                html: `<div><p>${description}</p> <a href=${link}>Click Here</a></div>`,
            })

            const obj = {
                tagId,
                email,
                link,
                accessType,
                uniqueToken,
                user
            }
            this.updateTagData(obj, true)

            return { status: 200, message: "email send" };
        } catch (error) {
            ctx.send({ status: 400, msg: error });
        }
    },

    async getTagViaEmail(ctx) {
        try {
            const { user } = ctx.state;
            const { tagId, email } = ctx.request.query;

            const tag = await strapi.entityService.findOne('api::tag.tag', tagId, {
                populate: {
                    users: {
                        fields: ["id"]
                    }
                }
            });
            const invitedUser = tag?.invitedUsersViaMail;
            let objIndex = invitedUser?.findIndex(d => d.emailId === email);
            if (objIndex === -1) return ctx.send({ status: 400, msg: 'No user exist' });

            const expiryDate = invitedUser[objIndex]?.expiryDate;
            const allowsDownload = invitedUser[objIndex]?.allowsDownload;
            const allowViews = invitedUser[objIndex]?.allowViews;
            const accessType = invitedUser[objIndex]?.accessType;
            const creationDate = moment(new Date()).format("DD/MM/YYYY");

            if (moment(expiryDate, "DD/MM/YYYY").isAfter(moment(creationDate, "DD/MM/YYYY")) && allowViews >= invitedUser[objIndex]?.linkClick && allowsDownload >= invitedUser[objIndex]?.totalDownload && !invitedUser[objIndex]?.isExpire) {

                if (invitedUser[objIndex]?.emailId !== user?.email) {
                    return ctx.send({ msg: 'You are not allowed to open this tag' }, 400);
                }

                if (!invitedUser[objIndex].isAccept) {
                    invitedUser[objIndex].isAccept = true;
                }
                invitedUser[objIndex].linkClick = invitedUser[objIndex].linkClick + 1;
                await strapi.entityService.update('api::tag.tag', tagId, {
                    data: {
                        invitedUsersViaMail: invitedUser
                    }
                });

                const requireTag = await strapi.entityService.findMany('api::tag.tag', {
                    filters: {
                        users: tag?.users[0]?.id
                    },
                    sort: { id: 'asc' },
                    populate: {
                        gems: {
                            fields: ["id", "url", "slug", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "socialfeedAt", "entityObj", "expander", "platform", "isRead", "comments_count", "shares_count", "likes_count", "save_count", "highlightId"]
                        },
                        child_tags: {
                            fields: ["id", "tag", "slug"]
                        },
                        users: {
                            fields: ["id", "username"]
                        }
                    }
                });

                const parentTag = requireTag.filter((d) => {
                    return d.id === parseInt(tagId)
                })

                const finalTag = this.prepareRequireTag(parentTag[0], requireTag)

                return ctx.send({
                    status: 200, msg: "Shared tag details is valid ", accessType, data: finalTag
                });
            }

            ctx.send({ status: 400, msg: 'Shared Tag details is expired. Please contact owner.' });

        } catch (error) {
            ctx.send({ status: 400, msg: error });

        }
    },

    async shareTagViaLink(ctx) {
        try {
            const { user } = ctx.state;
            const { tagId } = ctx.params;
            const uniqueToken = uuidv4();
            const { accessType,
                allowEmail } = ctx.request.body;

            let link = `${process.env.REDIRECT_URI}/check-user-tags/link?inviteId=${uniqueToken}&tagId=${tagId}&isLink=true`;

            if (allowEmail) {
                link = `${process.env.REDIRECT_URI}/check-user-tags/link?inviteId=${uniqueToken}&tagId=${tagId}&allowEmail=${allowEmail}&isLink=true`;
            }

            const obj = {
                tagId,
                link,
                accessType,
                uniqueToken,
                allowEmail,
                user
            }
            this.updateTagData(obj)

            return { status: 200, msg: 'Invited links created successfully', link };

        } catch (error) {
            ctx.send({ status: 400, msg: error });
        }
    },

    async getTagViaLink(ctx) {
        try {
            const { user } = ctx.state;
            const { inviteId, tagId } = ctx.request.query;

            const tag = await strapi.entityService.findOne('api::tag.tag', tagId, {
                populate: {
                    users: {
                        fields: ["id"]
                    },
                    child_tags: {
                        fields: ["id", "tag", "slug", "invitedUsersViaLink", "invitedUsersViaMail"]
                    }
                }
            });

            const invitedLink = tag?.invitedUsersViaLink;
            let invitedEmails = tag?.invitedUsersViaMail || [];
            if (!invitedLink) return ctx.send({ status: 400, msg: 'No invited link is exist' }, 400);

            let objIndex = invitedLink.findIndex((d => d.id === inviteId));
            if (objIndex === -1) return ctx.send({ status: 400, msg: 'No invite link is exist' }, 400);

            const domainOfMail = user?.email?.split("@")[1];

            if (invitedLink[objIndex].allowAllMail !== "all" && invitedLink[objIndex].allowAllMail.toLowerCase() !== domainOfMail.toLowerCase()) {
                return ctx.send({ status: 400, msg: "You are not authorized to access this tag content" });
            }

            const expiryDate = invitedLink[objIndex]?.expiryDate;
            const allowsDownload = invitedLink[objIndex]?.allowsDownload;
            const allowViews = invitedLink[objIndex]?.allowViews;
            const accessType = invitedLink[objIndex]?.accessType;
            const currentDate = moment(new Date()).format("DD/MM/YYYY");

            if (moment(expiryDate, "DD/MM/YYYY").isAfter(moment(currentDate, "DD/MM/YYYY")) && parseInt(allowViews) >= parseInt(invitedLink[objIndex].linkClick) && parseInt(allowsDownload) >= parseInt(invitedLink[objIndex].totalDownload) && !invitedLink[objIndex].isExpire) {

                const newUser = await strapi.db.query('plugin::users-permissions.user').findOne({
                    where: { email: user.email }
                })

                const emailIdx = invitedEmails.findIndex(d => d.emailId === user.email);

                if (newUser && emailIdx === -1) {
                    const uniqueToken = uuidv4();
                    const link = `${process.env.REDIRECT_URI}/check-user?token=${uniqueToken}&tagId=${tagId}&email=${newUser.email}`;
                    const invitedUsersObj = {
                        id: newUser?.id,
                        emailId: newUser?.email,
                        userName: newUser?.username,
                        link: link,
                        token: uniqueToken,
                        accessType: invitedLink[objIndex]?.accessType,
                        password: null,
                        isSecure: false,
                        isExpire: false,
                        permissions: invitedLink[objIndex]?.permissions,
                        expiryDate: invitedLink[objIndex]?.expiryDate,
                        allowViews: invitedLink[objIndex]?.allowViews,
                        allowsDownload: invitedLink[objIndex]?.allowsDownload,
                        totalDownload: 0,
                        linkClick: 0,
                        isAccept: true,
                        isViaLink: true
                    };
                    shareInviteTagTopToBottom(tag.child_tags, invitedUsersObj, true)
                    invitedEmails.push(invitedUsersObj)
                }

                invitedLink[objIndex].linkClick = invitedLink[objIndex]?.linkClick + 1;

                const tagData = await strapi.entityService.update('api::tag.tag', tagId, {
                    data: {
                        invitedUsersViaLink: invitedLink,
                        invitedUsersViaMail: invitedEmails
                    }
                });

                delete tagData.invitedUsersViaMail;

                const requireTag = await strapi.entityService.findMany('api::tag.tag', {
                    filters: {
                        users: tag.users[0].id
                    },
                    sort: { id: 'asc' },
                    populate: {
                        gems: {
                            fields: ["id", "url", "slug", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "socialfeedAt", "entityObj", "expander", "platform", "isRead", "comments_count", "shares_count", "likes_count", "save_count", "highlightId"]
                        },
                        child_tags: {
                            fields: ["id", "tag", "slug"]
                        },
                        users: {
                            fields: ["id", "username"]
                        }
                    }
                });

                const parentTag = requireTag.filter((d) => {
                    return d.id === parseInt(tagId)
                })

                const finalTag = this.prepareRequireTag(parentTag[0], requireTag)

                return ctx.send({ status: 200, msg: 'Invite links is valid', accessType, data: finalTag })
            }
            ctx.send({ status: 400, msg: 'Shared tag details is expired. Please contact owner.' });
        } catch (error) {
            ctx.send({ status: 400, msg: error });

        }
    },

    async shareTagPublicLink(ctx) {
        try {
            const { user } = ctx.state;
            const { tagId } = ctx.params;
            const { viewSettingObj, showSidebar, slug } = ctx.request.body;
            // const jwt = getService('jwt').issue({ id: user.id });

            // const uniqueId = uuidv4();
            // const link = `${process.env.REDIRECT_URI}/check-user-tags/public?inviteId=${uniqueId}&tagId=${tagId}`;
            const link = `${process.env.REDIRECT_URI}/u/${user.username.replace(" ", "")}/tags/${tagId}/${slug}`;


            strapi.entityService.update('api::tag.tag', tagId, {
                data: {
                    sharable_links: link,
                    isPublicLink: true,
                    viewSettingObj,
                    isShared: true,
                    showSidebar: showSidebar ? showSidebar : true
                }
            })
                .then((res) => {
                    // const object = {
                    //     action: "Shared",
                    //     module: "Tag",
                    //     actionType: "Tag",
                    //     count: 1,
                    //     author: { id: user.id, username: user.username },
                    //     collection_info: { id: tagData.id, name: tagData.name }
                    // }
                    // createActivity(object, jwt);
                })

            updatePlanService(user.id, "public_collection_tag")

            ctx.send({ status: 200, msg: 'Public link created successfully', link });

        } catch (error) {
            ctx.send({ status: 400, msg: error.message });
        }
    },

    async getTagViaPublicLink(ctx) {
        try {
            const { tagId, page, perPage, isPagination } = ctx.request.query;
            const tag = await strapi.entityService.findOne('api::tag.tag', tagId, {
                populate: {
                    users: {
                        fields: ["id"]
                    }
                }
            });
            delete tag?.originalPassword

            const tagsData = await strapi.entityService.findMany('api::tag.tag', {
                filters: {
                    users: tag?.users[0]?.id
                },
                sort: { id: 'asc' },
                populate: {
                    child_tags: {
                        fields: ["id", "tag", "slug"],
                    },
                    gems: {
                        fields: ["id", "url", "title", "slug", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "socialfeedAt", "entityObj", "expander", "platform", "isRead", "comments_count", "shares_count", "likes_count", "save_count", "highlightId"]
                    },
                    users: {
                        fields: ["id", "username", "firstname", "profilePhoto"]
                    }
                }
            });

            if (!tagsData) return ctx.send({ status: 400, msg: 'No tag exist' });

            const parentTag = tagsData.filter((d) => {
                return d.id === parseInt(tagId)
            })
            const count = parentTag[0]?.gems?.length;
            if (isPagination === 'true') {
                const pages = page ? page : '';
                const perPages = perPage ? perPage : 20;
                const pageNum = parseInt(pages);
                const perPagesNum = parseInt(perPages);
                const start = pageNum === 0 ? 0 : (pageNum - 1) * perPagesNum;
                const limit = start + perPagesNum;


                parentTag[0].gems = parentTag[0]?.gems?.slice(start, limit);
            }

            let finalTag = this.prepareRequireTag(parentTag[0], tagsData);

            const follower = await strapi.db.query("api::follower.follower").findOne({
                where: { userId: tag?.users[0]?.id?.toString() },
                populate: {
                    follower_users: {
                        select: ['id']
                    }
                }
            })

            finalTag[0].author.follower = follower?.follower_users || []
            finalTag[0].author.following = follower?.following_users || []

            ctx.send({ status: 200, msg: 'Get public tag shared successfully', totalCount: count, data: finalTag })

        } catch (error) {
            ctx.send({ status: 400, msg: error });
        }
    },

    async disablePublicLink(ctx) {
        try {
            const { user } = ctx.state;
            const { tagId } = ctx.params;

            await strapi.entityService.update('api::tag.tag', tagId, {
                data: {
                    sharable_links: null,
                    isPublicLink: false,
                    tagPassword: null,
                    originalPassword: null,
                    showSeo: false
                }
            });
            updatePlanService(user.id, "public_collection_tag")

            ctx.send({ status: 200, msg: 'Public link is unable' })

        } catch (error) {
            ctx.send({ status: 400, msg: error })
        }
    },

    async checkUserRegister(ctx) {
        try {
            const { tokenId, tagId } = ctx.params;
            const { email } = ctx.request.query;

            /* Fetching tagId details */
            const tag = await strapi.db.query("api::tag.tag").findOne({
                where: {
                    id: parseInt(tagId)
                }
            })

            if (!tag || !tag?.invitedUsersViaMail) return ctx.send({ msg: 'No tag or invited user found' }, 400);

            /* checking tokenId existing into UserInvitedObj */
            const inviteUser = tag?.invitedUsersViaMail.find(i_users => (i_users.token === tokenId));

            if (!inviteUser) return ctx.send({ msg: 'No invited user exist' }, 400);

            if (inviteUser?.isGroupShare) {
                const grpMember = inviteUser?.members?.find(u => u.email === email)
                if (!grpMember) return ctx.send({ status: 400, msg: 'No invited user exist' });
                if (inviteUser.token && grpMember.id) {
                    return ctx.send({ status: 200, msg: 'Register-user' })
                }
            }

            if (inviteUser.token && inviteUser.id) {
                return ctx.send({ status: 200, msg: 'Register-user' })
            }
            return ctx.send({ status: 400, msg: 'Unregister-user' })

        } catch (err) {
            ctx.send({ msg: "error occrued" }, 400);
        }
    },

    async sharedCollToUnRegisteredUser(ctx) {
        try {
            const { tokenId, tagId } = ctx.request.query;
            const { id, email, username, profilePhoto, firstname, lastname } = ctx.state.user;

            /* Fetching tag details by collId  */
            const tag = await strapi.db.query("api::tag.tag").findOne({
                where: {
                    id: parseInt(tagId)
                }
            })
            if (!tag) return ctx.send({ msg: 'No tag exists' }, 400);

            /* Checking tokenId is exist or not ? */
            const inviteUserIndex = tag?.invitedUsersViaMail ? (tag?.invitedUsersViaMail?.findIndex(i_users => (i_users.token === tokenId))) : null;

            /* Updating inviteUserObj into tag/folder */
            const updatedInvitedUsersList = tag?.invitedUsersViaMail;
            if (updatedInvitedUsersList[inviteUserIndex]?.isGroupShare) {
                const gIdx = updatedInvitedUsersList[inviteUserIndex]?.members?.findIndex(gMem => gMem.email === email)
                updatedInvitedUsersList[inviteUserIndex].members[gIdx] = { ...updatedInvitedUsersList[inviteUserIndex]?.members[gIdx], id: id, email: email, username: username, avatar: profilePhoto, name: `${firstname} ${lastname}` };
            } else {
                updatedInvitedUsersList[inviteUserIndex] = { ...updatedInvitedUsersList[inviteUserIndex], id: id, emailId: email, userName: username };
            }

            await strapi.db.query("api::tag.tag").update({
                where: {
                    id: parseInt(tagId)
                },
                data: {
                    invitedUsersViaMail: updatedInvitedUsersList
                }
            })

            ctx.send({ status: 200, msg: 'Un-register user details updated successfully' });
        } catch (err) {
            ctx.send({ msg: "error occrued" }, 400);
        }
    },

    async setSecurityOnLink(ctx) {
        try {
            const { user } = ctx.state;

            if (!user) {
                ctx.send({
                    message: "Unauthorized User!"
                })
                return
            }

            const {
                accessType,
                allowsDownload,
                allowViews,
                expiryDate
            } = ctx.request.body;
            const { tagId } = ctx.params;
            const { id, isLink } = ctx.request.query;
            const tag = await strapi.entityService.findOne('api::tag.tag', tagId);
            const permissions = await accessTagPermissions(accessType);

            if (isLink === "true") {

                const index = tag?.invitedUsersViaLink?.findIndex(d => d.id === id);
                let invitedUsers = tag?.invitedUsersViaLink;
                invitedUsers[index].accessType = accessType;
                invitedUsers[index].allowViews = allowViews;
                invitedUsers[index].allowsDownload = allowsDownload;
                invitedUsers[index].expiryDate = expiryDate;
                invitedUsers[index].permissions = permissions;

                await strapi.entityService.update('api::tag.tag', tagId, {
                    data: {
                        invitedUsersViaLink: invitedUsers
                    }
                })

            } else {

                const index = tag?.invitedUsersViaMail?.findIndex(d => d.token === id);
                let invitedUsers = tag?.invitedUsersViaMail;
                invitedUsers[index].accessType = accessType;
                invitedUsers[index].allowViews = allowViews;
                invitedUsers[index].allowsDownload = allowsDownload;
                invitedUsers[index].expiryDate = expiryDate;
                invitedUsers[index].permissions = permissions;

                await strapi.entityService.update('api::tag.tag', tagId, {
                    data: {
                        invitedUsersViaMail: invitedUsers
                    }
                })

            }

            ctx.send({ status: 200, msg: 'Update successfully.' })

        } catch (error) {
            ctx.send({
                message: error
            })
        }
    },

    async setPassword(ctx) {
        try {
            const { user } = ctx.state;

            if (!user) {
                return ctx.send({
                    message: "Unauthorized User"
                })
            }

            const { password } = ctx.request.body;
            let hashedPassword = null

            if (password) {
                const saltRounds = 10; // number of salt rounds to use
                const salt = await bcrypt.genSalt(saltRounds);
                hashedPassword = await bcrypt.hash(password, salt);
            }

            const { tagId } = ctx.params;

            await strapi.entityService.update('api::tag.tag', tagId, {
                data: {
                    tagPassword: hashedPassword ? hashedPassword : null,
                    originalPassword: password
                }
            })

            ctx.send({ status: 200, msg: "Password set to invitedUser links successfully" })
        } catch (error) {
            ctx.send({
                message: error
            })
        }
    },

    async checkPassword(ctx) {
        try {
            const { tagId } = ctx.params;
            const { password } = ctx.request.body;

            const tag = await strapi.entityService.findOne('api::tag.tag', tagId);
            const tagPassword = tag?.tagPassword;

            if (!tagPassword) {
                return ctx.send({ status: 200, msg: 'Password not set for this tag' });
            }

            if (!password) {
                return ctx.send({ status: 200, msg: 'Password not provided in request boddy' });
            }

            const isPasswordCorrect = await bcrypt.compare(password, tagPassword);

            if (isPasswordCorrect) {
                return ctx.send({ status: 200, msg: 'Password matched successfully', isMatched: isPasswordCorrect });
            }

            ctx.send({ status: 400, msg: 'Invalid Credentials', isMatched: false });
        } catch (error) {
            console.log(error);
        }
    },

    async expireLink(ctx) {
        try {
            const { user } = ctx.state;

            if (!user) {
                ctx.send({
                    message: "Unauthorized User"
                })
            }

            let updatedTag
            const { tagId } = ctx.params;
            const { id, isLink } = ctx.request.query;

            if (isLink === "false") {
                const tag = await strapi.entityService.findOne('api::tag.tag', tagId, {
                    populate: {
                        child_tags: {
                            fields: ["id", "tag", "slug", "invitedUsersViaMail", "invitedUsersViaLink"]
                        }
                    }
                });

                let userEmail = null;
                const invitedUser = tag?.invitedUsersViaMail
                const invitedUserObj = invitedUser.filter(d => {
                    if (d?.token === id) {
                        userEmail = d?.emailId
                    }
                    return (d.token !== id)
                });

                removeShareChildLevelTag(tag.child_tags, userEmail)

                updatedTag = await strapi.entityService.update('api::tag.tag', tagId, {
                    data: {
                        invitedUsersViaMail: invitedUserObj
                    }
                })
                return ctx.send({ status: 200, msg: 'Access remove successfully' })
            }

            const tag = await strapi.entityService.findOne('api::tag.tag', tagId);
            const invitedLink = tag?.invitedUsersViaLink
            const invitedLinkObj = invitedLink?.filter(d => {
                if (d.id === id) {
                    userEmail = d?.emailId
                }
                return (d.id !== id)
            });

            updatedTag = await strapi.entityService.update('api::tag.tag', tagId, {
                data: {
                    invitedUsersViaLink: invitedLinkObj
                }
            })

            return ctx.send({ status: 200, msg: 'Access remove successfully' })

        } catch (error) {
            ctx.send({
                message: error.message
            })
        }
    },

    async shareTagToGroupViaEmail(ctx) {
        try {
            const { id } = ctx.state.user;
            const { tagId } = ctx.params;
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
            const link = `${process.env.REDIRECT_URI}/check-user-tags?token=${uniqueToken}&tagId=${tagId}&groupId=${groupId}`;

            for (const email of emails) {
                strapi.plugins['email'].services.email.send({
                    to: email,
                    from: 'noreply@curateit.com',
                    subject: 'Share Tag',
                    html: `<div><p>${description}</p> <a href=${link}>Click Here</a></div>`,
                })
                // const object = {
                //     action: "Shared",
                //     module: "Tag",
                //     actionType: "Tag",
                //     count: 1,
                //     author: { id: id, username: username },
                //     tag_info: { id: tagData.id, name: tagData.name }
                // }
                // createActivity(object, jwt);  
            }

            const tag = await strapi.entityService.findOne('api::tag.tag', tagId, {
                populate: '*'
            });
            if (tag.invitedUsersViaMail != null) invitedUsersArr.push(...tag.invitedUsersViaMail);
            index = invitedUsersArr.findIndex(d => d.id === parseInt(groupId) && d.isGroupShare === true);
            expiryDate = moment(new Date()).add(1, 'years').format("DD/MM/YYYY")
            // configLimit = await strapi.entityService.findMany('api::config-limit.config-limit')
            configLimit = await strapi.db.query("api::config-limit.config-limit").findOne({
                where: { allowViews: { $notNull: true }, allowsDownload: { $notNull: true } }
            })

            permissions = await accessTagPermissions(accessType);

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

            shareInviteTagTopToBottom(tag.child_tags, invitedUsersObj, false, true, groupId)
            index === -1 ? invitedUsersArr.push(invitedUsersObj) : invitedUsersArr[index] = invitedUsersObj;
            strapi.entityService.update('api::tag.tag', tagId, {
                data: {
                    invitedUsersViaMail: invitedUsersArr,
                }
            });

            return { status: 200, message: "email send" };

        } catch (error) {
            ctx.send({ status: 400, error: error.message })
        }
    },

    async getShareTagToGroup(ctx) {
        try {
            const { id, email } = ctx.state.user;
            const { tagId } = ctx.params;
            const { groupId } = ctx.request.query;

            const tag = await strapi.entityService.findOne('api::tag.tag', tagId, {
                populate: {
                    users: {
                        fields: ["id"]
                    }
                }
            });

            const invitedUser = tag.invitedUsersViaMail;
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
                strapi.entityService.update('api::tag.tag', tagId, {
                    data: {
                        invitedUsersViaMail: invitedUser
                    }
                });

                const requireTag = await strapi.entityService.findMany('api::tag.tag', {
                    filters: {
                        users: tag?.users[0]?.id
                    },
                    sort: { id: 'asc' },
                    populate: {
                        gems: {
                            fields: ["id", "url", "slug", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "socialfeedAt", "entityObj", "expander", "platform", "isRead", "comments_count", "shares_count", "likes_count", "save_count", "highlightId"]
                        },
                        child_tags: {
                            fields: ["id", "tag", "slug"]
                        },
                        users: {
                            fields: ["id", "username"]
                        }
                    }
                });

                const parentColl = requireTag.filter((d) => {
                    return d.id === parseInt(tagId)
                })

                const finalTag = this.prepareRequireTag(parentColl[0], requireTag)

                return ctx.send({
                    status: 200, msg: "Shared tag details is valid ", accessType, isShareTag: tag.isShareTag, data: finalTag
                });
            }

            ctx.send({ status: 400, msg: 'Shared tag details is expired. Please contact owner.' });

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

            const { tagId } = ctx.params;
            const { token } = ctx.request.query;
            const tag = await strapi.entityService.findOne('api::tag.tag', tagId);
            const permissions = await accessTagPermissions(accessType);

            let invitedUsers = tag.invitedUsersViaMail;
            const index = invitedUsers.findIndex(d => d.token === token);
            if (index !== -1) {
                invitedUsers[index].accessType = accessType;
                invitedUsers[index].allowViews = allowViews;
                invitedUsers[index].allowsDownload = allowsDownload;
                invitedUsers[index].expiryDate = expiryDate;
                invitedUsers[index].permissions = permissions;
                invitedUsers[index].members = JSON.parse(members);

                await strapi.entityService.update('api::tag.tag', tagId, {
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




    async getChildFolder(tag, userId) {
        const res = await strapi.db.query('api::tag.tag').findOne({
            where: {
                id: tag.id
            },

            populate: {
                users: {
                    select: ["id", "firstname", "lastname", "username", "profilePhoto"]
                },
                parent_tag: {
                    select: ["id", "tag", "slug"],
                    populate: {
                        users: {
                            select: ["id", "firstname", "lastname", "username", "profilePhoto"]
                        },
                    }
                },
                child_tags: true,
                gems: {
                    select: ["id", "url", "slug", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "socialfeedAt", "entityObj", "expander", "platform", "isRead", "comments_count", "shares_count", "likes_count", "save_count", "highlightId"]
                }
            }
        })
        const invitedUsers = res.invitedUsersViaMail
        const invitedUsersLinks = res.invitedUsersViaLink
        const currentUser = invitedUsers?.filter((d) => { return (userId && !d.isGroupShare && d.id === userId) || (d.members && d.members?.findIndex((m) => { m.id === userId }) !== -1) })
        const currentUserLinks = invitedUsersLinks?.filter((d) => { return d.emailArr?.indexOf(email) !== -1 })

        const user = currentUser?.length > 0 ? currentUser[0] : currentUserLinks?.length > 0 ? currentUserLinks[0] : null
        const accessType = user?.accessType
        const permissions = user?.permissions

        return { ...res, accessType, permissions }
    },

    async prepareSubFolder(tags, userId, email) {
        const arr = []
        for (const cIdx in tags) {
            const c = tags[cIdx]
            let shareTag = false
            c?.invitedUsersViaMail?.forEach((i) => {
                if (i?.emailId === email) {
                    shareTag = true
                }

                if (i?.isGroupShare) {
                    i?.members?.forEach((m) => {
                        if (m?.email === email) {
                            shareTag = true
                        }
                    })
                }
            })

            if (shareTag) {
                const p = await this.getChildFolder(c, userId)
    
                let folders = []
                if (p.child_tags?.length > 0) {
                    folders = await this.prepareSubFolder(p.child_tags, userId, email)
                }
                const copyObj = p.gems ? [...p.gems] : []
                delete p.gems
                p.author = (p.users.length > 0) ? p.users[0] : null
                delete p.users
                arr.push({
                    ...p,
                    folders,
                    bookmarks: copyObj
                })
            }
        }
        return arr
    },

    async prepareSubShareTag(tags, userId, email) {
        const arr = []
        for (const idx1 in tags) {
            const invitedUsers = tags[idx1].invitedUsersViaMail
            const invitedUsersLinks = tags[idx1].invitedUsersViaLink
            const o = tags[idx1]
            const copyObj = o.gems ? [...o.gems] : []
            const currentUser = invitedUsers?.filter((d) => { return (userId && !d.isGroupShare && d.id === userId) || (d.members && d.members?.findIndex((m) => { m.id === userId }) !== -1) })
            const currentUserLinks = invitedUsersLinks?.filter((d) => { return d.emailArr?.indexOf(email) !== -1 })

            const user = currentUser?.length > 0 ? currentUser[0] : currentUserLinks?.length > 0 ? currentUserLinks[0] : null
            const accessType = user?.accessType
            const permissions = user?.permissions
            let folders = []
            // delete o.invitedUsersViaMail
            delete o.gems
            o.author = (o.users.length > 0) ? o.users[0] : null
            delete o.users

            if (o.child_tags?.length > 0) {
                folders = await this.prepareSubFolder(o.child_tags, userId, email)
            }
            arr.push({
                ...o,
                accessType,
                permissions,
                folders: folders,
                bookmarks: copyObj
            })

        }
        return arr
    },

    async shareWithMeTags(ctx) {
        try {
            const { user } = ctx.state;

            const entries = await strapi.db.query('api::tag.tag').findMany({
                where: {
                    $or: [
                        {
                            invitedUsersViaMail: {
                                $notNull: true
                            }
                        },
                        {
                            invitedUsersViaLink: {
                                $notNull: true
                            }
                        }
                    ]
                },
                sort: { id: 'asc' },
                populate: {
                    users: {
                        select: ["id", "firstname", "lastname", "username", "profilePhoto"]
                    },
                    parent_tag: {
                        select: ["id", "tag", "slug", "shortDescription"],
                        populate: {
                            users: {
                                select: ["id", "firstname", "lastname", "username", "profilePhoto"]
                            },
                        }
                    },
                    child_tags: true,
                    gems: {
                        select: ["id", "url", "slug", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "socialfeedAt", "entityObj", "expander", "platform", "isRead", "comments_count", "shares_count", "likes_count", "save_count", "highlightId"]
                    }
                }
            });

            let shareArr = []
            const newEntries = entries.map((e) => { return { ...e, usersViaMail: JSON.stringify(e.invitedUsersViaMail) } })
            const eArr = newEntries.filter((n) => { return n.usersViaMail.includes(user.email) })
            shareArr = [...shareArr, ...eArr]

            entries.forEach((e) => {
                const links = e.invitedUsersViaLink?.filter((i) => { return i.emailArr }) || []
                const idx = links.findIndex((s) => { return s.emailArr?.indexOf(user.email) !== -1 })

                if (idx !== -1) {
                    shareArr = [...shareArr, e]
                }
            })

            const finalResults = await this.prepareSubShareTag(shareArr.filter((s) => {
                const index = shareArr.findIndex((h) => { return h.id === s.parent_tag?.id })
                return index === -1
            }), user.id, user.email)

            ctx.send({ status: 200, data: finalResults })
        } catch (error) {
            ctx.send({ status: 400, message: error });
        }
    },

    prepareTagData(tag, mainData) {
        const arr = []
        // if (tag.child_tags === null || tag.parent_tag === undefined || tag.parent_tag?.length === 0) {
        if (!tag?.child_tags || tag?.child_tags?.length === 0) {
            const copyObj = tag.gems ? [...tag.gems] : []
            // delete tag.parent_tag
            delete tag.gems
            tag.author = (tag.users.length > 0) ? tag.users[0] : null
            delete tag.users
            arr.push({
                ...tag,
                folders: [],
                bookmarks: copyObj
            })

            return arr
        }

        if (Array.isArray(tag?.child_tags)) {
            const copyObj = tag.gems ? [...tag.gems] : []
            const obj = {
                ...tag,
                folders: [],
                bookmarks: copyObj
            }
            tag.child_tags?.forEach((p) => {
                const idx = mainData.findIndex((d) => { return d.id === p.id })
                if (idx !== -1) {
                    obj.folders = [...obj.folders, ...this.prepareTagData(mainData[idx], mainData)]
                }
            })
            obj.author = (obj.users.length > 0) ? obj.users[0] : null
            delete obj.users
            delete obj.child_tags
            delete obj.gems
            return [obj]
        }
    },

    async sharePublicTag(ctx) {
        try {
            const { tagId, page, perPage, isPagination } = ctx.request.query;

            const tag = await strapi.entityService.findOne('api::tag.tag', tagId, {
                populate: {
                    users: {
                        fields: ["id"]
                    }
                }
            });
            const tagData = await strapi.entityService.findMany('api::tag.tag', {
                // fields: ["id", "tag", "slug", "avatar", "sharable_links"],
                filters: {
                    users: tag.users[0].id
                },
                sort: { id: 'asc' },
                populate: {
                    child_tags: true,
                    gems: {
                        fields: ["id", "url", "slug", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "socialfeedAt", "entityObj", "expander", "platform", "isRead", "comments_count", "shares_count", "likes_count", "save_count", "highlightId", "imageColor"]
                    },
                    users: {
                        fields: ["id", "username", "firstname", "profilePhoto"]
                    },
                    parent_tag: {
                        fields: ["id", "tag", "slug", "avatar", "sharable_links"],
                        populate: {
                            users: {
                                fields: ["id", "username", "firstname", "profilePhoto"]
                            },
                            // gems: {
                            //     fields: ["id", "url", "slug", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "socialfeedAt", "entityObj", "expander", "platform", "isRead", "comments_count", "shares_count", "likes_count", "save_count", "highlightId", "imageColor"]
                            // },
                        }
                    }
                }
            });

            const parentTag = tagData.filter((d) => {
                return d.id === parseInt(tagId)
            })

            const count = parentTag[0]?.gems?.length;
            if (isPagination === 'true') {
                const pages = page ? page : '';
                const perPages = perPage ? perPage : 20;
                const pageNum = parseInt(pages);
                const perPagesNum = parseInt(perPages);
                const start = pageNum === 0 ? 0 : (pageNum - 1) * perPagesNum;
                const limit = start + perPagesNum;


                parentTag[0].gems = parentTag[0]?.gems?.slice(start, limit);
            }

            // let finalTag = this.prepareTagData(parentTag[0], tagData)

            const finalTag = [parentTag[0]];

            finalTag[0].author = (finalTag[0].users.length > 0) ? finalTag[0].users[0] : null
            const follower = await strapi.db.query("api::follower.follower").findOne({
                where: { userId: tag.users[0].id.toString() },
                populate: {
                    follower_users: {
                        select: ['id']
                    }
                }
            })

            finalTag[0].author.follower = follower?.follower_users || []
            finalTag[0].author.following = follower?.following_users || []
            let parentTagDetails = null

            if (finalTag[0]?.parent_tag && finalTag[0]?.parent_tag?.sharable_links) {
                // const parentTagData = this.prepareTagData(finalTag[0]?.parent_tag, tagData)
                const parentTagData = [finalTag[0]?.parent_tag]
                parentTagDetails = parentTagData
                // parentTagDetails[0].count = parentTagData[0]?.bookmarks?.length
                parentTagDetails[0].author = (parentTagDetails[0].users.length > 0) ? parentTagDetails[0].users[0] : null
                delete parentTagDetails[0].users
                delete parentTagDetails[0].sharable_links
            }

            finalTag[0].bookmarks = finalTag[0]?.gems
            delete finalTag[0].users
            delete finalTag[0].gems
            delete finalTag[0].parent_tag
            delete finalTag[0].child_tags
            delete finalTag[0].folders
            delete finalTag[0].order_of_gems
            ctx.send({ status: 200, msg: 'Get public tag shared successfully', totalCount: count, data: finalTag, parentTag : parentTagDetails })

        } catch (error) {
            ctx.send({ status: 400, message: error.message });
        }
    },

    async removeShareTag(ctx) {
        try {
            const { user } = ctx.state;
            const { tagId } = ctx.params;

            const tag = await strapi.entityService.findOne("api::tag.tag", tagId, {
                fields: ["id", "tag", "invitedUsersViaMail", "invitedUsersViaLink"]
            })

            let invitedUsers = tag?.invitedUsersViaMail
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

            await strapi.entityService.update('api::tag.tag', tagId, {
                data: {
                    invitedUsersViaMail: invitedUsers
                }
            })

            return ctx.send({ status: 200, message: "Tag remove successfully" });

        } catch (error) {
            return ctx.send({ status: 400, message: error.message });
        }
    },

    prepareChildCollectionsAndItsCount(childCollection, collection, parentCollection) {
        const arr = [];
        for (const coll of childCollection) {
            const cIdx = collection.findIndex((c) => parseInt(c.id) === parseInt(coll.id))
            if (cIdx !== -1) {
                const cObj = collection[cIdx];
                const obj = {
                    id: cObj?.id,
                    name: cObj?.name,
                    // count: count || 0,
                    is_sub_collection: cObj?.is_sub_collection,
                    folders: []
                }

                if (cObj?.parent_collection > 0) {
                    obj.folders = this.prepareChildCollectionsAndItsCount(cObj.parent_collection, collection, { id: cObj.id, name: cObj.name })
                }
                arr.push(obj)
            }
        }
        return arr
    },

    async shareTagCollectionCount(ctx) {
        try {
            const { tagId } = ctx.params;

            const tag = await strapi.entityService.findOne('api::tag.tag', tagId, {
                populate: {
                    users: {
                        fields: ["id"]
                    },
                    gems: {
                        populate: {
                            collection_gems: {
                                fields: ["id", "name", "is_sub_collection", "avatar", "background", "slug", "media_type"],
                                populate: {
                                    author: {
                                        fields: ["id", "username"]
                                    },
                                    gems: {
                                        fields: ["id", "url", "slug", "isPending", "isApproved"],
                                        populate: {
                                            author: {
                                                fields: ["id", "username"]
                                            },
                                            tags: {
                                                fields: ["id", "tag", "slug"]
                                            }
                                        }
                                    },
                                    parent_collection: {
                                        fields: ["id", "name", "is_sub_collection", "avatar", "background", "slug", "media_type"],
                                    }
                                }
                            },
                            author: {
                                fields: ["id", "username"]
                            }
                        }
                    }
                }
            });

            let approvedGems = tag?.gems?.filter((g) => {
                if ((g?.author?.id === tag?.users[0]?.id) || (g?.isApproved === true && g?.isPending === false)) {
                    return g
                }
            })

            tag.gems = approvedGems;
            const collectionArr = tag?.gems?.map((g) => {
                return g.collection_gems
            })

            const collectionArray = collectionArr.flat(Infinity)

            const arr = []
            collectionArray?.filter((c) => {
                const cIdx = arr.findIndex((a) => a?.id === c?.id)
                if (cIdx === -1) {
                    arr.push(c)
                }
                return arr;
            })

            const mainArr = arr?.filter((a) => a?.is_sub_collection === false)

            const finalArr = [];
            mainArr?.forEach((m) => {
                const gemsArr = []
                const count = m?.gems?.filter((g) => {
                    if (g?.tags?.find((t) => t?.id === parseInt(tagId))?.id === parseInt(tagId)) {
                        return gemsArr.push(g)
                    }
                });

                const obj = {
                    id: m?.id,
                    name: m?.name,
                    count: gemsArr?.length,
                    avatar: m?.avatar,
                    is_sub_collection: m?.is_sub_collection,
                    media_type: m?.media_type,
                    background: m?.background,
                    slug: m?.slug,
                    folders: []
                }

                if (m?.parent_collection > 0) {
                    obj.folders = this.prepareChildCollectionsAndItsCount(m.parent_collection, arr, { id: m.id, name: m.name })
                }
                finalArr.push(obj)
            })

            return ctx.send({ status: 200, data: finalArr });
        } catch (error) {
            return ctx.send({ status: 400, message: error.message });
        }
    },

    async shareGemFiltersCountByMediaType(ctx) {
        try {
            const { tagId } = ctx.params;

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

            const allGems = await strapi.entityService.findOne("api::tag.tag", tagId, {
                fields: ["id", "tag", "slug"],
                populate: {
                    gems: {
                        fields: ["media_type", "isApproved", "isPending"],
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
            let approvedGems = allGems?.gems?.filter((data) => {
                if ((data?.author?.id === allGems?.users[0]?.id) || (data?.isApproved === true && data?.isPending === false)) {
                    return data
                }
            })

            allGems.gems = approvedGems
            const typesObj = {}
            mediaTypes.forEach((type) => {
                typesObj[type] = allGems.gems.filter((g) => g.media_type === type).length
            })

            return ctx.send(typesObj)

        } catch (error) {
            return ctx.send({ message: error.message });
        }
    },

    async categoryGemsForTag(ctx) {
        try {
            const { type, page, perPage } = ctx.request.query;
            const { tagId } = ctx.params;
            const pages = page ? page : 1;
            const perPages = perPage ? perPage : 10;
            const pageNum = parseInt(pages);
            const perPagesNum = parseInt(perPages);

            let filters = {
                tags: parseInt(tagId)
            }


            filters.media_type = type

            const [gems, tag, gemsCount] = await Promise.all([
                strapi.entityService.findMany("api::gem.gem", {
                    populate: {
                        tags: true,
                        collection_gems: true,
                        author: { fields: ["id"] }
                    },
                    filters,
                    start: pageNum === 0 ? 0 : (pageNum - 1) * perPagesNum,
                    limit: perPagesNum
                }),
                strapi.entityService.findOne("api::tag.tag", parseInt(tagId), {
                    fields: ["id", "tag"],
                    populate: {
                        users: {
                            fields: ["id", "username"]
                        }
                    }
                }),
                strapi.entityService.count("api::gem.gem", {
                    filters,
                }),
            ])

            let approvedGems = gems?.filter((data) => {
                if ((data?.author?.id === tag?.users[0]?.id) || (data?.isApproved === true && data?.isPending === false)) {
                    return data
                }
            })
            const totalCount = gemsCount

            ctx.send({ status: 200, totalCount, data: approvedGems });
        } catch (error) {
            ctx.send({ status: 400, message: error.message });
        }
    },

    async collectionGemsForTag(ctx) {
        try {
            const { tagId } = ctx.request.params;
            const { page, perPage, collectionId } = ctx.request.query;
            const pages = page ? page : 1;
            const perPages = perPage ? perPage : 10;
            const pageNum = parseInt(pages);
            const perPagesNum = parseInt(perPages);

            const collection = await strapi.entityService.findOne("api::collection.collection", collectionId, {
                populate: {
                    gems: {
                        fields: ["id", "url", "slug", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "socialfeedAt", "expander", "platform", "isRead", "fileType", "isPending", "isApproved"],
                        populate: {
                            author: {
                                fields: ["id", "username"]
                            },
                            collection_gems: {
                                fields: ["id", "name", "slug"]
                            },
                            tags: {
                                fields: ["id", "tag", "slug"]
                            }
                        }
                    },
                    author: {
                        fields: ["id", "username"]
                    }
                }
            })

            delete collection?.originalPassword

            let gemsData = collection?.gems?.filter((g) => {
                return g?.tags?.filter((t) => {
                    if (parseInt(t?.id) === parseInt(tagId)) {
                        return true
                    }
                }).length !== 0
            }
            )

            const totalCount = gemsData?.length;
            const totalPages = Math.ceil(parseInt(gemsData?.length) / perPagesNum);

            if (pageNum > totalPages) {
                collection.gems = [];
            } else {
                const start = (pageNum - 1) * perPagesNum;
                const end = start + perPagesNum;
                const paginatedGems = gemsData.slice(start, end);
                collection.gems = paginatedGems;
            }

            ctx.send({ status: 200, totalCount, data: collection })
        } catch (error) {
            ctx.send({ status: 400, message: error.message });
        }
    },

    async sharePublicSubTag(ctx) {
        try {
            const { tagId, page, perPage, isPagination } = ctx.request.query;

            const tag = await strapi.entityService.findOne('api::tag.tag', tagId, {
                fields: ["id", "tag", "slug"],
                populate: {
                    users: {
                        fields: ["id"]
                    }
                }
            });
            const tags = await strapi.entityService.findMany('api::tag.tag', {
                filters: {
                    users: tag.users[0].id
                },
                sort: { id: 'asc' },
                fields: ["id", "tag", "slug", "avatar", "is_sub_tag", "media_type", "background"],
                populate: {
                    child_tags: {
                        fields: ["id", "tag", "slug"],
                    },
                    gems: {
                        fields: ["id", "slug", "isApproved", "isPending"],
                        populate: {
                            author: {
                                fields: ["id"]
                            }
                        }
                    },
                    users: {
                        fields: ["id", "username", "firstname", "profilePhoto"]
                    },
                }
            });

            let parentTag = tags.filter((d) => {
                return d.id === parseInt(tagId)
            })
            const count = parentTag[0]?.gems?.length;
            // if (isPagination === 'true') {
            //     const pages = page ? page : '';
            //     const perPages = perPage ? perPage : 20;
            //     const pageNum = parseInt(pages);
            //     const perPagesNum = parseInt(perPages);
            //     const start = pageNum === 0 ? 0 : (pageNum - 1) * perPagesNum;
            //     const limit = start + perPagesNum;
            //     parentTag[0].gems = parentTag[0]?.gems?.slice(start, limit);
            // }

            let finalTag = await subTagIds(parentTag[0], tags, true)

            const follower = await strapi.db.query("api::follower.follower").findOne({
                where: { userId: tag.users[0].id.toString() },
                populate: {
                    follower_users: {
                        select: ['id']
                    }
                }
            })

            // finalTag[0].users[0].follower = follower?.follower_users
            // finalTag[0].users[0].following = follower?.following_users
            finalTag[0].author.follower = follower?.follower_users
            finalTag[0].author.following = follower?.following_users

            ctx.send({ status: 200, msg: 'Get public collection shared successfully', totalCount: count, data: finalTag })

        } catch (error) {
            ctx.send({ status: 400, message: error.message });
        }
    },
}))