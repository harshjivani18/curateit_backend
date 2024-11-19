'use strict';

const { convertRestQueryParams } = require('strapi-utils/lib');

/**
 * gem controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
// const { updateGemiScoreRecs, updatePlanService, areCollectionIdSame, getFullScreenshot, createActivity } = require("../../../../utils");
// const { getService } = require('../../../extensions/users-permissions/utils');
const { createBulkElasticData, updateScreenshotsData } = require('../services/after-operations');

module.exports = createCoreController('api::gem.gem', ({ strapi }) => ({

    async importGemsWithIcons(ctx) {
        const { data } = ctx.request.body
        const { user } = ctx.state

        if (data && user) {
            try {
                const promiseArr = data.map((gem) => {
                    return strapi.service("api::gem.gem").createGemPromiseForIcon(gem, user)
                })
                const response = await Promise.all(promiseArr);
                createBulkElasticData(user.id, response, user.username)
                // updateScreenshotsData(user.id, response, user.username)
                return ctx.send({ data: response })
            }
            catch (err) {
                return ctx.send({ message: err })
            }
        }
        return ctx.send({ message: "Data or user not found" })
    }
}))