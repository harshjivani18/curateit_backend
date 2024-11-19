'use strict';

/**
 * subscription controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::subscription.subscription', ({ strapi }) => ({ 
    async paddleCancelSubscription(ctx) {
        const { subscriptionId } = ctx.params;
        const subscription       = await strapi.db.query('api::subscription.subscription').findOne({
            where: { id: subscriptionId }
        });
        const res                = await strapi.service('api::subscription.paddle-subscriptions').cancelSubscriptionPaddle(subscription?.subscription_id)
        return ctx.send(res);
    },
    async paddleChangePlan(ctx) {
        const { user }           = ctx.state;
        const { subscriptionId } = ctx.params;
        const { planId }         = ctx.request.body;
        const newPlan            = await strapi.db.query('api::plan.plan').findOne({
            where: { id: planId }
        })
        const subscription       = await strapi.db.query('api::subscription.subscription').findOne({
            where: { id: subscriptionId }
        });
        const res                = await strapi.service('api::subscription.paddle-subscriptions').changePlanPaddle(subscription?.subscription_id, newPlan?.price_id, user)
        return ctx.send(res);
    },
    async getInvoicePDF(ctx) {
        const { invoiceId } = ctx.params;
        const res           = await strapi.service('api::subscription.paddle-subscriptions').getInvoicePDF(invoiceId)
        return ctx.send(res);
    },
    async updateBilledEmailAddress(ctx) {
        const { customer_id }   = ctx.params
        const { email }         = ctx.request.body
        const res               = await strapi.service('api::subscription.paddle-subscriptions').updateCustomerBilledEmail(customer_id, email)
        return ctx.send(res);
    },
    async fetchPricingPreview(ctx) {
        const { subscriptionId } = ctx.params
        const { customerId,
                newPriceId }     = ctx.request.body
        const res                = await strapi.service('api::subscription.paddle-subscriptions').fetchPricingPreview(subscriptionId, customerId, newPriceId)
        return ctx.send(res);
    },
    async getUpdatePaymentMethodTransaction(ctx) {
        const { subscriptionId } = ctx.params
        const subscription       = await strapi.db.query('api::subscription.subscription').findOne({
            where: { id: parseInt(subscriptionId) }
        });
        if (!subscription) {
            return ctx.send({ status: 400, error: { code:"subscription-not-found", message:'Subscription not found' }})
        }
        const res                = await strapi.service('api::subscription.paddle-subscriptions').getUpdatePaymentMethodURL(subscription.subscription_id)
        return ctx.send(res);
    }
}));
