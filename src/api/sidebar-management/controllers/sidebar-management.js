'use strict';

const axios = require('axios');
/**
 * sidebar-management controller
 */
const { parse } = require('tldts');
const { getService } = require('../../../extensions/users-permissions/utils');
const { sidebarAppData, createActivity } = require('../../../../utils');

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::sidebar-management.sidebar-management', ({ strapi }) => ({

    find: async (ctx) => {
        try {
            const { user } = ctx.state;
            if (!user) {
                ctx.send("Unauthorized user")
                return
            }

            const sidebar = await strapi.entityService.findMany('api::sidebar-management.sidebar-management', {
                filters: { author: user.id }
            })

            ctx.send(sidebar)
        } catch (error) {
            ctx.send({
                message: error
            })
        }
    },

    getAllPublicSidebar: async (ctx) => {
        try {

            const data = await strapi.entityService.findMany('api::sidebar-management.sidebar-management', {
                filters: {
                    viewType: "Public",
                }
            })

            const sidebarApps = data.reduce((result, item) => {
                const existingCategory = result.find(
                    (category) => category.name === item.categoryType
                );

                if (existingCategory) {
                    existingCategory.apps.push(item);
                } else {
                    result.push({
                        name: item.categoryType,
                        apps: [item],
                    });
                }

                return result;
            }, []);

            const element = sidebarApps.find(item => item.name === 'AI');
            if (element) {
                sidebarApps.splice(sidebarApps.indexOf(element), 1);
                sidebarApps.unshift(element);
            }

            ctx.send({
                sidebarApps
            })
        } catch (error) {
            ctx.send({
                message: error
            })
        }
    },

    sequenceSidebar: async (ctx) => {
        try {
            const { user } = ctx.state;
            const { sidebar } = ctx.request.body;
            const jwt = getService('jwt').issue({ id: user.id });

            const sidebarArr = await strapi.db.query('plugin::users-permissions.user').update({
                where: { id: user.id },
                data: {
                    sidebarArr: sidebar
                }
            });

            /* logs data for update hightlighed text  */
            // await strapi.entityService.create("api::activity-log.activity-log", {
            //     data: {
            //         action: "Updated",
            //         module: "SidebarApps",
            //         actionType: "App shorcut",
            //         author: user.id,
            //         publishedAt: new Date().toISOString(),
            //     },
            // });
            
            const object = {
                action: "Updated",
                module: "SidebarApps",
                actionType: "App shortcut",
                // collection_info: { id: data.result.id, name: data.result.name },
                author: {id: user.id, username: user.username},

                count: 1,
            }
            createActivity(object, jwt);
            // await axios.post(
            //     `${process.env.MONGODB_URL}/api/activitylogs`,
            //     {
            //         action: "Updated",
            //         module: "SidebarApps",
            //         actionType: "App shortcut",
            //         collection_info: { id: data.result.id, name: data.result.name },
            //         count: 1,
            //     },
            //     {
            //         headers: {
            //             Authorization: `Bearer ${jwt}`
            //         },
            //     }
            // )

            ctx.send(sidebarArr);
        } catch (error) {
            ctx.send({
                message: error
            })
        }
    },

    getSequenceSidebar: async (ctx) => {
        try {
            const { user } = ctx.state;

            const sidebarArr = await strapi.db.query('plugin::users-permissions.user').findOne({
                where: { id: user.id },
                select: ['id', 'username', 'sidebarArr']
            });

            ctx.send(sidebarArr);

        } catch (error) {
            ctx.send({
                message: error
            })
        }
    },

    updateMostVisitedApp: async (ctx) => {
        try {
            const { user } = ctx.state;
            const jwt = getService('jwt').issue({ id: user.id });
            const sidebar = await strapi.entityService.findMany('api::sidebar-management.sidebar-management', {
                filters: { author: user.id }
            })

            if (sidebar.length !== 0) {
                return ctx.send(sidebar)
            }

            const { body } = ctx.request;
            const objs = []
            for (const item of body) {
                const parsedURL = parse(item.url)
                const site = await strapi.db.query('api::sidebar-management.sidebar-management').findOne({
                    where: {
                        url: {
                            $contains: parsedURL.domain,
                        },
                    },
                });
                const o = {
                    name: site ? site.name : item.name,
                    url: site ? site.url : item.url,
                    icon: site ? site.icon : item.icon,
                    author: user.id,
                    publishedAt: new Date().toISOString(),
                }
                objs.push(await strapi.entityService.create('api::sidebar-management.sidebar-management', {
                    data: o
                }))
            }
            if (objs.length > 0) {
                /* logs data for update hightlighed text  */
                // await strapi.entityService.create("api::activity-log.activity-log", {
                //     data: {
                //         action: "Created",
                //         module: "SidebarApps",
                //         actionType: "App shorcut",
                //         author: user.id,
                //         publishedAt: new Date().toISOString(),
                //     },
                // });
                const object = {
                    action: "Created",
                    module: "SidebarApps",
                    actionType: "App shortcut",
                    count: 1,
                    author: { id: user.id, username: user.username }
                }
                createActivity(object, jwt);
                // await axios.post(
                //     `${process.env.MONGODB_URL}/api/activitylogs`,
                //     {
                //         action: "Created",
                //         module: "SidebarApps",
                //         actionType: "App shortcut",
                //         count: 1,
                //         author: { id: user.id, username: user.username }
                //     },
                //     {
                //         headers: {
                //             Authorization: `Bearer ${jwt}`
                //         },
                //     }
                // )
            }

            const userSidebarArr = user.sidebarArr || []
            await strapi.db.query('plugin::users-permissions.user').update({
                where: { id: user.id },
                data: {
                    sidebarArr: [...userSidebarArr, ...objs.map((o) => {
                        return {
                            id: o.id,
                            url: o.url,
                            icon: o.icon,
                            imgUrl: o.icon,
                            name: o.name,
                            category: o.category,
                            openAs: o.openAs,
                            viewType: o.viewType
                        }
                    })]
                }
            });

            return ctx.send(objs)
        } catch (error) {
            ctx.send({
                message: error
            })
        }
    },

    addSidebarApp: async (ctx) => {
        try {

            sidebarAppData.map((s) => {
                s.publishedAt = new Date().toISOString()

                strapi.entityService.create("api::sidebar-management.sidebar-management", {
                    data: s
                })
            })

            ctx.send({ status: 200, message: "success" });
        } catch (error) {
            ctx.send(error);
        }
    }

}));
