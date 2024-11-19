'use strict';

/**
 * custom-field controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const {filterByCF} = require("../../../../utils"); 
const { deleteCustomFieldsFromGems, updateCustomFieldsFromGems } = require('../services/customfields-service');

module.exports = createCoreController('api::custom-field.custom-field', {
    getCustomFields: async (ctx) => {
        try { 
            const customFields = await strapi.entityService.findMany('api::custom-field.custom-field', {
                filters: {
                    collection: {
                        id: {
                            $eq: ctx.params.collectionId
                        }
                    }
                },
            })

            ctx.send(customFields)
        } catch (error) {
            ctx.send({status: 400, message: error})
        }
    },

    create: async (ctx) => {
        try {
            const collection = ctx.request.body.data.collection;
            const { data } = ctx.request.body;
            let customFields;
            const customFieldsData = await strapi.db.query('api::custom-field.custom-field').findMany({
                where: {
                    collection: {
                        id: {
                            $eq: collection
                        }
                    }
                }
            })
            
            if (customFieldsData.length > 0) {
                const customFieldsArr = customFieldsData[0];
                const properties = customFieldsArr.customFieldObj;
                const customFieldObj = properties === null ? data.customFieldObj : properties.push(...data.customFieldObj);

                customFields = await strapi.db.query('api::custom-field.custom-field').update({
                    where: { id: customFieldsArr.id },
                    data: {
                        customFieldObj: properties === null ? customFieldObj : properties,
                        publishedAt: new Date().toISOString()
                    }
                })

                return ctx.send(customFields);
            }

            customFields = await strapi.db.query('api::custom-field.custom-field').create({
                data: {
                    ...data,
                    publishedAt: new Date().toISOString()
                }
            })

            ctx.send(customFields);

        } catch (error) {
            ctx.send({status: 400, message: error})
        }
    },

    update: async (ctx) => {
        try {
            const data = ctx.request.body;
            const customFieldId = ctx.params.id;
 
            const customFieldsData = await strapi.db.query('api::custom-field.custom-field').findOne({
                where: {
                    id: customFieldId
                },
                populate: {
                    collection: { select: ["id"]}
                }
            })

            customFieldsData.customFieldObj.map(e => {
                if(e?.id === data?.id) {
                    e.name = data?.name
                    e.type = data?.type
                    e.options != undefined && (e.options = data?.options)
                    e.defaultValue = data?.defaultValue
                    e.tempOptionValue = data?.tempOptionValue
                    e.isLabel = data?.isLabel
                }
            })
            const customFields = await strapi.db.query('api::custom-field.custom-field').update({
                where: {
                    id: customFieldId
                },
                data: {
                    customFieldObj: customFieldsData.customFieldObj,
                    publishedAt: new Date().toISOString()
                }
            })
            updateCustomFieldsFromGems(customFieldsData?.collection?.id, data)
            ctx.send(customFields);
        } catch (error) {
            ctx.send({status: 400, message: error})
        }
    },
    
    delete: async (ctx) => {
        try {
            const data = ctx.request.query.id;
            const customFieldId = ctx.params.id;
            const customFieldsData = await strapi.db.query('api::custom-field.custom-field').findOne({
                where: {
                    id: customFieldId
                },
                populate: {
                    collection: { select: ["id"]}
                }
            })

            deleteCustomFieldsFromGems(customFieldsData.collection.id, data)

           const updatedFields = customFieldsData.customFieldObj.filter(e => {
               return e.id !== data
                 
            })

            const customFields = await strapi.db.query('api::custom-field.custom-field').update({
                where: {
                    id: customFieldId
                },
                data: {
                    customFieldObj: updatedFields,
                    publishedAt: new Date().toISOString()
                }
            })

            ctx.send(customFields);
        } catch (error) {
            ctx.send({status: 400, message: error})
        }
    },
    async filterBookmarkByCF(ctx){
        const userId = ctx.state.user.id;
        const {collectionId , groupBy,subGroupBy} = ctx.request.query;
        
        if(collectionId){
            const collections = await strapi.entityService.findOne('api::collection.collection', collectionId, {
                filters: {
                  author: userId
                },
                fields:["id","name", "slug", "comments_count", "shares_count", "likes_count", "save_count"],
                populate: {
                  collection: {
                    fields: ["id", "slug", "name", "comments_count", "shares_count", "likes_count", "save_count"]
                  },
                  gems: {
                    fields: ["id", "url", "slug", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite","custom_fields_obj", "expander", "comments_count", "shares_count", "likes_count", "save_count"],
                    populate: {
                      tags: {
                        fields: ["id", "tag", "slug"]
                      }
                    }
                  }
                }
            });
            
            /* here grouping bookmarks data on basis of customField */
            const { gems } = collections;
            let groupByCF = [];
            let saveSubgrp;
            if(groupBy){
                let groupData = filterByCF(gems,groupBy);
                delete collections.gems;
                if(subGroupBy){
                    for(const gm of gems){
                        const customFdArr = gm?.custom_fields_obj;
                        if(customFdArr){
                            // checking groupBy fd is exists or not ?
                            const cusGrpFd = customFdArr.find(cf=>(cf?.name && (cf.name.toLowerCase() === groupBy.toLowerCase() && cf?.answer)));
                            const cusSubGrpFd = customFdArr.find(cf=>(cf?.name && (cf.name.toLowerCase() === subGroupBy.toLowerCase() && cf?.answer)));
                            if(cusGrpFd && cusSubGrpFd){
                                if(groupData[cusGrpFd?.answer]){
                                    const existsObj = groupData[cusGrpFd.answer];
                                    existsObj[cusSubGrpFd.answer] = existsObj[cusSubGrpFd.answer] ? ({...existsObj[cusSubGrpFd.answer],subGrp:[...existsObj[cusSubGrpFd.answer].subGrp,gm]}) : { name:cusSubGrpFd.answer,subGrp:[gm]};      
                                }
                            }else if(cusGrpFd && !cusSubGrpFd){
                                if(groupData[cusGrpFd?.answer]){
                                    const existsObj = groupData[cusGrpFd.answer];
                                    existsObj["no-subgroup"] = existsObj["no-subgroup"] ? ({...existsObj["no-subgroup"],subGrp:[...existsObj["no-subgroup"].subGrp,gm]}) : { name:`No ${subGroupBy}`,subGrp:[gm]};   
                                }
                            }else if(!cusGrpFd && cusSubGrpFd){
                                if(groupData["no-group"]){
                                    const existsObj = groupData["no-group"];
                                    existsObj[cusSubGrpFd.answer] = existsObj[cusSubGrpFd.answer] ? ({...existsObj[cusSubGrpFd.answer],subGrp:[...existsObj[cusSubGrpFd.answer].subGrp,gm]}) : { name:cusSubGrpFd.answer,subGrp:[gm]};   
                                }
                            }else{
                                if(groupData["no-group"]){
                                    const existsObj = groupData["no-group"];
                                    existsObj["no-subgroup"] = existsObj["no-subgroup"] ? ({...existsObj["no-subgroup"],subGrp:[...existsObj["no-subgroup"].subGrp,gm]}) : { name:`No ${subGroupBy}`,subGrp:[gm]};   
                                }   
                            }
                        }else {
                            if(groupData["no-group"]){
                                const existsObj = groupData["no-group"];
                                existsObj["no-subgroup"] = existsObj["no-subgroup"] ? ({...existsObj["no-subgroup"],subGrp:[...existsObj["no-subgroup"].subGrp,gm]}) : { name:`No ${subGroupBy}`,subGrp:[gm]};   
                            }
                        }     
                    }
                    collections.groupData = groupData;  
                }
                for(const gd in groupData){
                    const subGroup = groupData[gd];
                    for(const subGrp in subGroup){
                        if(subGrp !=='name' && subGrp!=='grpData'){
                           saveSubgrp = groupData[gd][subGrp];
                           delete groupData[gd][subGrp];              
                        }
                    }
                    groupByCF.push({...groupData[gd],subGrpData:saveSubgrp});
                }
                collections.groupData = groupByCF;
            }
            ctx.send(collections);                
        }else{
            ctx.send([]);
        }

    }
});
