'use strict';

const { v4: uuidv4 } = require("uuid");

exports.shareInviteTopToBottom = async (collectionId, invitedObj, isViaLink=false, isGroupShare=false, groupId) => {
    try {

        const collection = await strapi.entityService.findOne("api::collection.collection", collectionId, {
            fields: ['id', 'name', 'invitedUsersViaMail', 'invitedUsersViaLinks'],
            populate: {
                author: {
                    fields: ['id', 'email']
                },
                parent_collection: {
                    fields: ['id', 'name', 'invitedUsersViaMail', 'invitedUsersViaLinks']
                },
            }
        })

        if (!collection) return null;

        if (collection.parent_collection && collection.parent_collection.length > 0) {
            for (const parentCollection of collection.parent_collection) {
                await this.shareInviteTopToBottom(parentCollection.id, invitedObj, isViaLink, isGroupShare, groupId);
            }
        }

        // Frontend redirect url that shared into user-mail 
        const uniqueToken = uuidv4();
        const link = isGroupShare ? `${process.env.REDIRECT_URI}/check-user?token=${uniqueToken}&collectionId=${collectionId}&groupId=${groupId}` : `${process.env.REDIRECT_URI}/check-user?token=${uniqueToken}&collectionId=${collectionId}&email=${invitedObj?.emailId}`;

        let invitedUsersArr = [];
        if (collection.invitedUsersViaMail != null) invitedUsersArr.push(...collection.invitedUsersViaMail);
        const index = !isGroupShare ? invitedUsersArr.findIndex(d => d.emailId === invitedObj?.emailId) : invitedUsersArr.findIndex(d => d.id === parseInt(groupId) && d.isGroupShare === true)

        const obj = {
            id: invitedObj?.id,
            emailId: invitedObj?.emailId,
            userName: invitedObj?.userName,
            link: link,
            token: uniqueToken,
            accessType: invitedObj?.accessType,
            password: null,
            isSecure: false,
            isExpire: false,
            permissions: invitedObj?.permissions,
            expiryDate: invitedObj?.expiryDate,
            allowViews: invitedObj?.allowViews,
            allowsDownload: invitedObj?.allowsDownload,
            totalDownload: 0,
            linkClick: 0,
            isAccept: false,
        }

        if (isViaLink) obj.isViaLink = true
        if (isGroupShare) {
            delete obj.emailId;
            delete obj.userName;
            obj.group = invitedObj?.group;
            obj.members = invitedObj?.members;
            obj.isGroupShare = true;
        }

        index === -1 ? invitedUsersArr.push(obj) : invitedUsersArr[index] = obj;

        await strapi.entityService.update('api::collection.collection', collectionId, {
            data: {
                invitedUsersViaMail: invitedUsersArr,
                isShareCollection: true,
                isShared: true
            }
        });

    } catch (error) {
        console.log("shareInviteTopToBottom error ===>", error.message);
    }
}

exports.removeShareChildLevelCollection = async (parentCollection, email) => {
    try {

        for (const p of parentCollection) {

            const collection = await strapi.entityService.findOne("api::collection.collection", p?.id, {
                fields: ['id', 'name', 'invitedUsersViaMail', 'invitedUsersViaLinks'],
                populate: {
                    parent_collection: {
                        fields: ['id', 'name', 'invitedUsersViaMail', 'invitedUsersViaLinks']
                    },
                }
            })

            if (!collection) return null;

            if (collection?.parent_collection && collection?.parent_collection?.length > 0) {
                await this.removeShareChildLevelCollection(collection?.parent_collection, email);
            }

            const invitedLink = collection.invitedUsersViaMail
            const invitedLinkObj = invitedLink.filter(d => d?.emailId !== email)
    
            await strapi.entityService.update('api::collection.collection', p?.id, {
                data: {
                    invitedUsersViaMail: invitedLinkObj
                }
            });
        }
    
    } catch (error) {
        console.log("removeShareChildLevelCollection error ===>", error.message);
    }
}