'use strict';

/**
 * bookmark-config controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::bookmark-config.bookmark-config', ({ strapi }) => ({

    async getBookmarkConfig(ctx) {
        const userId = ctx?.state?.user?.id;
        const { queryUserId } = ctx.request.query;

        /* Get bookmark config details by userId */
        const bookmarkConfig = await strapi.db.query('api::bookmark-config.bookmark-config').findOne({
            where: {
                author: userId || queryUserId
            }
        })
        if (!bookmarkConfig) {
            return ctx.send({ msg: 'No bookmark exist' });
        }
        delete bookmarkConfig.configCollSetting
        delete bookmarkConfig.configFilterSetting
        delete bookmarkConfig.configLinksSetting
        delete bookmarkConfig.configTagSetting
        ctx.send({ msg: 'Get bookmark config details', data: bookmarkConfig });
    },
    async changeBookmarkConfig(ctx) {
        const userId = ctx.state.user.id;
        const requestBody = ctx.request.body;

        const updatedBookmarkConfig = await strapi.db.query('api::bookmark-config.bookmark-config').update({
            where: {
                author: userId
            },
            data: { ...requestBody }
        })

        ctx.send({ msg: 'Bookmark config updated successfully', data: updatedBookmarkConfig });
    },
    async addCollConfigSetting(ctx) {
        try {
            const userId = ctx.state.user.id;
            const requestBody = ctx.request.body;
            const { isFilter, isTag, isLinks } = ctx.request.query;

            /* Get bookmark config details by userId */
            const bookmarkConfig = await strapi.db.query('api::bookmark-config.bookmark-config').findOne({
                where: {
                    author: userId
                }
            })

            if (!bookmarkConfig) {
                return ctx.send({ msg: 'No bookmark-config-setting exist' }, 400);
            }

            let updateConfigSetting;
            let updatedBookmarkConfig;

            if (isFilter) {
                updatedBookmarkConfig = await strapi.db.query('api::bookmark-config.bookmark-config').update({
                    where: {
                        author: userId
                    },
                    data: {
                        configFilterSetting: requestBody.data
                    }
                })

                ctx.send({ data: updatedBookmarkConfig.configFilterSetting });
                return;
            }

            if (isLinks) {
                updatedBookmarkConfig = await strapi.db.query('api::bookmark-config.bookmark-config').update({
                    where: {
                        author: userId
                    },
                    data: {
                        configLinksSetting: requestBody.data
                    }
                })

                ctx.send({ data: updatedBookmarkConfig.configLinksSetting });
                return;
            }

            if (isTag) {
                let { configTagSetting } = bookmarkConfig;
                if (!configTagSetting) {
                    updateConfigSetting = [requestBody];
                } else {
                    const TagIndex = configTagSetting.findIndex(c_Tag => (c_Tag.tagId === requestBody.tagId));
                    TagIndex !== -1 ? (configTagSetting[TagIndex] = requestBody) : (configTagSetting = [...configTagSetting, requestBody]);
                }

                updatedBookmarkConfig = await strapi.db.query('api::bookmark-config.bookmark-config').update({
                    where: {
                        author: userId
                    },
                    data: {
                        configTagSetting: bookmarkConfig?.configTagSetting ? configTagSetting : updateConfigSetting
                    }
                })
                ctx.send({ data: updatedBookmarkConfig.configTagSetting });
                return;
            }

            let { configCollSetting } = bookmarkConfig;
            if (!configCollSetting) {
                updateConfigSetting = [requestBody];
            } else {
                const collPageIndex = configCollSetting.findIndex(c_coll => (c_coll.pageId === requestBody.pageId));
                collPageIndex !== -1 ? (configCollSetting[collPageIndex] = requestBody) : (configCollSetting = [...configCollSetting, requestBody]);
            }

            updatedBookmarkConfig = await strapi.db.query('api::bookmark-config.bookmark-config').update({
                where: {
                    author: userId
                },
                data: {
                    configCollSetting: bookmarkConfig?.configCollSetting ? configCollSetting : updateConfigSetting
                }
            })

            ctx.send({ data: updatedBookmarkConfig.configCollSetting });

        } catch (err) {
            console.log("error occured :", err);
            ctx.send({ message: err }, 400);
        }
    },

    async addFilterConfigSetting(ctx) {
        try {
            const userId = ctx.state.user.id;
            const requestBody = ctx.request.body;

            /* Get bookmark config details by userId */
            const bookmarkConfig = await strapi.db.query('api::bookmark-config.bookmark-config').findOne({
                where: {
                    author: userId
                }
            })

            if (!bookmarkConfig) {
                return ctx.send({ msg: 'No bookmark-config-setting exist' }, 400);
            }

            let updateConfigSetting;
            let { configCollSetting } = bookmarkConfig;
            if (!configCollSetting) {
                updateConfigSetting = [requestBody];
            } else {
                const collPageIndex = configCollSetting.findIndex(c_coll => (c_coll.pageId === requestBody.pageId));
                collPageIndex !== -1 ? (configCollSetting[collPageIndex] = requestBody) : (configCollSetting = [...configCollSetting, requestBody]);
            }

            const updatedBookmarkConfig = await strapi.db.query('api::bookmark-config.bookmark-config').update({
                where: {
                    author: userId
                },
                data: {
                    configCollSetting: bookmarkConfig?.configCollSetting ? configCollSetting : updateConfigSetting
                }
            })

            ctx.send({ data: updatedBookmarkConfig.configCollSetting });

        } catch (err) {
            console.log("error occured :", err);
            ctx.send({ message: err }, 400);
        }
    }

}));
