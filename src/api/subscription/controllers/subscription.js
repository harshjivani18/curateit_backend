'use strict';

/**
 * subscription controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::subscription.subscription', ({ strapi }) => ({ 
    async handleSubscription(ctx) {
        // Set paddle webhook response into our database
        const { event_type, data } = ctx.request.body;
        console.log("Event Type ===>", event_type)
        if (event_type === "transaction.ready") {
            await strapi.service('api::subscription.subscription').transactionReady(data)
        }
        else if (event_type === "transaction.created") {
            await strapi.service('api::subscription.subscription').transactionCreated(data)
        }
        else if (event_type === "transaction.paid") {
            await strapi.service('api::subscription.subscription').transactionPaid(data)
        }
        else if (event_type === "transaction.billed") {
            await strapi.service('api::subscription.subscription').transactionBilled(data)
        }
        else if (event_type === "transaction.canceled") {
            await strapi.service('api::subscription.subscription').transactionCanceled(data)
        }
        else if (event_type === "transaction.payment_failed") {
            await strapi.service('api::subscription.subscription').transactionPaymentFailed(data)
        }
        else if (event_type === "transaction.completed") {
            await strapi.service('api::subscription.subscription').transactionCompleted(data)
        }
        else if (event_type === "transaction.updated") {
            await strapi.service('api::subscription.subscription').transactionUpdated(data)
        }
        else if (event_type === "subscription.created") {
            await strapi.service('api::subscription.subscription').subscriptionCreated(data)
        }
        else if (event_type === "subscription.canceled" || event_type === "subscription.past_due") {
            await strapi.service('api::subscription.subscription').subscriptionCanceled(data)
        }
        else if (event_type === "subscription.activated") {
            await strapi.service('api::subscription.subscription').subscriptionActivated(data)
        }
        else if (event_type === "subscription.updated") {
            await strapi.service('api::subscription.subscription').subscriptionUpdated(data)
        }

        return ctx.send("Done!")
    }
}));
