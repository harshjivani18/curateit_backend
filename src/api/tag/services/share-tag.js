'use strict';

const { v4: uuidv4 } = require("uuid");

exports.shareInviteTagTopToBottom = async (childTags, invitedObj, isViaLink=false, isGroupShare=false, groupId) => {
    try {
        for (const c of childTags) {
            const tag = await strapi.entityService.findOne("api::tag.tag", c?.id, {
                fields: ['id', 'tag', 'invitedUsersViaMail', 'invitedUsersViaLink'],
                populate: {
                    users: {
                        fields: ['id', 'email']
                    },
                    child_tags: {
                        fields: ['id', 'tag', 'invitedUsersViaMail', 'invitedUsersViaLink']
                    }
                }
            })

            const invitedUsersArr = []
            if (tag?.child_tags && tag.child_tags.length > 0) {
                await this.shareInviteTagTopToBottom(tag.child_tags, invitedObj, isViaLink, isGroupShare, groupId);
            }

            const uniqueToken = uuidv4();
            const link = isGroupShare ? `${process.env.REDIRECT_URI}/check-user-tags?token=${uniqueToken}&tagId=${tag?.id}&groupId=${groupId}` : `${process.env.REDIRECT_URI}/check-user-tags?token=${uniqueToken}&tagId=${tag?.id}&email=${invitedObj?.emailId}`;

            if (tag?.invitedUsersViaMail != null) invitedUsersArr.push(...tag.invitedUsersViaMail);
            const index = !isGroupShare ? invitedUsersArr.findIndex(d => d.emailId === invitedObj?.email) : invitedUsersArr.findIndex(d => d.id === parseInt(groupId) && d.isGroupShare === true);

            const invitedUsersObj = {
                id: invitedObj?.id,
                emailId: invitedObj?.emailId,
                userName: invitedObj?.userName,
                link: link,
                token: uniqueToken,
                accessType: invitedObj?.accessType,
                password: null,
                isSecure: false,
                isExpire: false,
                permissions : invitedObj?.permissions,
                expiryDate: invitedObj?.expiryDate,
                allowViews: invitedObj?.allowViews,
                allowsDownload: invitedObj?.allowsDownload,
                totalDownload: 0,
                linkClick: 0,
                isAccept: false,
            };

            if (isViaLink) invitedUsersObj.isViaLink = true;
            if (isGroupShare) {
                delete invitedUsersObj.emailId;
                delete invitedUsersObj.userName;
                invitedUsersObj.group = invitedObj?.group;
                invitedUsersObj.members = invitedObj?.members;
                invitedUsersObj.isGroupShare = true;
            }

            index === -1 ? invitedUsersArr.push(invitedUsersObj) : invitedUsersArr[index] = invitedUsersObj;

            await strapi.entityService.update('api::tag.tag', tag?.id, {
                data: {
                    invitedUsersViaMail: invitedUsersArr,
                    isShareCollection: true,
                    isShared: true
                }
            });

        }
    } catch (error) {
        console.log("shareInviteTagTopToBottom error ===>", error.message);
    }
}

exports.removeShareChildLevelTag = async (childTags, email) => {
    try {
        for (const p of childTags) {
            const tag = await strapi.entityService.findOne("api::tag.tag", p?.id, {
                fields: ['id', 'tag', 'invitedUsersViaMail', 'invitedUsersViaLink'],
                populate: {
                    child_tags: {
                        fields: ['id', 'tag', 'invitedUsersViaMail', 'invitedUsersViaLink']
                    },
                }
            })

            if (!tag) return null;

            if (tag?.child_tags && tag?.child_tags?.length > 0) {
                await this.removeShareChildLevelTag(tag?.child_tags, email);
            }

            const invitedLink = tag.invitedUsersViaMail
            const invitedLinkObj = invitedLink.filter(d => d?.emailId !== email)

            await strapi.entityService.update('api::tag.tag', p?.id, {
                data: {
                    invitedUsersViaMail: invitedLinkObj
                }
            });
        }
    
    } catch (error) {
        console.log("removeShareChildLevelCollection error ===>", error.message);
    }
}