'use strict';

const { CANCEL_SUBSCRIPTION_EMAIL } = require('../../../../emails/cancel-subscription');
const { CHANGE_SUBSCRIPTION_EMAIL } = require('../../../../emails/change-subscription');
const { SUBSCRIBED_EMAIL } = require('../../../../emails/subscribed');
const { getService } = require('../../../extensions/users-permissions/utils');

/**
 * subscription service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::subscription.subscription', ({ strapi }) => ({ 
    transactionReady: async (data) => {
        const priceId = data?.custom_data?.user?.price_id || null;
        if (priceId) {
            const plan          = await strapi.db.query('api::plan.plan').findOne({ 
                where: { 
                    price_id: priceId 
                } 
            });
            const author        = await strapi.db.query('plugin::users-permissions.user').findOne({
                where: { id: parseInt(data?.custom_data?.user?.id) }
            })
            const payment       = data?.payments[0] || null;
            const currentTransaction = await strapi.db.query('api::transaction.transaction').findOne({
                where: { transaction_id: data?.id, price_id: priceId } 
            });
            if (!currentTransaction && data?.status !== "draft") {
                const obj = {
                    plan: plan.id,
                    price_id: priceId,
                    transaction_id: data.id,
                    payment_details: data?.payments,
                    status: data.status,
                    author: author.id || null,
                    email: author.email || null,
                    invoice_number: data?.invoice_number,
                    payment_method_id: payment?.payment_method_id,
                    currency_code: data?.currency_code,
                    transaction_amount: payment?.amount,
                    invoice_id: data?.invoice_id,
                    customer_id: data?.customer_id,
                    publishedAt: new Date().toISOString()
                }
                if (data?.status === "billed" && data?.details?.totals?.credit_to_balance) {
                    obj.credit_to_balance = data?.details?.totals?.credit_to_balance
                    obj.transaction_amount = data?.details?.totals?.total
                }
                await strapi.entityService.create('api::transaction.transaction', {
                    data: obj
                })
            }
        }
    },
    transactionCreated: async (data) => {
        const priceId = data?.custom_data?.user?.price_id || null;
        if (priceId) {
            const plan          = await strapi.db.query('api::plan.plan').findOne({ 
                where: { 
                    price_id: priceId 
                } 
            });
            const author        = await strapi.db.query('plugin::users-permissions.user').findOne({
                where: { id: parseInt(data?.custom_data?.user?.id) }
            })
            const payment       = data?.payments[0] || null;
            const currentTransaction = await strapi.db.query('api::transaction.transaction').findOne({
                where: { transaction_id: data?.id, price_id: priceId } 
            });
            if (!currentTransaction && data?.status !== "draft") {
                const obj = {
                    plan: plan.id,
                    price_id: priceId,
                    transaction_id: data.id,
                    payment_details: data?.payments,
                    status: data.status,
                    author: author.id || null,
                    email: author.email || null,
                    invoice_number: data?.invoice_number,
                    payment_method_id: payment?.payment_method_id,
                    currency_code: data?.currency_code,
                    transaction_amount: payment?.amount,
                    invoice_id: data?.invoice_id,
                    customer_id: data?.customer_id,
                    publishedAt: new Date().toISOString()
                }
                if (data?.status === "billed" && data?.details?.totals?.credit_to_balance) {
                    obj.credit_to_balance = data?.details?.totals?.credit_to_balance
                    obj.transaction_amount = data?.details?.totals?.total
                }
                await strapi.entityService.create('api::transaction.transaction', {
                    data: obj
                })
            }
        }
    },
    transactionBilled: async (data) => {
        const priceId = data?.custom_data?.user?.price_id || null;
        if (priceId) {
            await strapi.db.query('api::transaction.transaction').update({
                where: { transaction_id: data?.id, price_id: priceId },
                data: {
                    billed_at: data.billed_at
                }
            })
        }
    },
    transactionPaid: async (data) => {
        const payment       = data?.payments[0] || null;
        const priceId       = data?.custom_data?.user?.price_id || null;
        if (payment && priceId) {
            await strapi.db.query('api::transaction.transaction').update({
                where: { transaction_id: data?.id, price_id: priceId },
                data: {
                    status: data.status,
                    payment_details: data?.payments || null,
                    payment_method_id: payment?.payment_method_id
                }
            })
        }
    },
    transactionCanceled: async (data) => {
        const priceId = data?.custom_data?.user?.price_id || null;
        if (priceId) {
            await strapi.db.query('api::transaction.transaction').update({
                where: { transaction_id: data?.id, price_id: priceId },
                data: {
                    status: data.status
                }
            })
        }
    },
    transactionPaymentFailed: async (data) => {
        const payment     = data?.payments[0] || null;
        const priceId     = data?.custom_data?.user?.price_id || null;
        if (payment && priceId) {
            const transaction = await strapi.db.query('api::transaction.transaction').update({
                where: { transaction_id: data?.id, price_id: priceId },
                data: {
                    status: "failed",
                    payment_details: data?.payments || null,
                    payment_method_id: payment?.payment_method_id,
                }
            })
            if (transaction && transaction?.author && transaction?.plan) {
                await strapi.service('api::plan-service.migrate-user-service').cancelOrPaymentFailed(transaction?.author, transaction?.plan, null)
            }
        }     
    },
    transactionCompleted: async (data) => {
        const payment     = data?.payments[0] || null;
        const priceId     = data?.custom_data?.user?.price_id || null;
        if (payment && priceId) {
            await strapi.db.query('api::transaction.transaction').update({
                where: { transaction_id: data?.id, price_id: priceId },
                data: {
                    invoice_id: data?.invoice_id,
                    invoice_number: data?.invoice_number,
                    transaction_amount: payment?.amount
                }
            })
        }
    },
    transactionUpdated: async (data) => {
        const priceId     = data?.custom_data?.user?.price_id || null;
        if (priceId) {
            const transaction = await strapi.db.query('api::transaction.transaction').findOne({
                where: { transaction_id: data?.id, price_id: priceId } 
            })
            if (transaction && !transaction.subscription_id) {
                const subscription = await strapi.db.query('api::subscription.subscription').update({
                    where: { subscription_id: data?.subscription_id, is_active: true },
                    data: {
                        transaction_id: data?.id
                    } 
                })
                if (subscription) {
                    const obj = {}
                    if (!transaction.subscription_id) {
                        obj.subscription_id = data?.subscription_id
                        obj.subscription    = subscription.id
                    }
                    if (!transaction.invoice_id) {
                        obj.invoice_id = data?.invoice_id
                        obj.invoice_number = data?.invoice_number
                    }
                    if (!transaction.transaction_amount) {
                        obj.transaction_amount = data?.payments[0]?.amount
                    }
                    if (Object.keys(obj).length > 0) {
                        await strapi.db.query('api::transaction.transaction').update({
                            where: { transaction_id: data?.id, price_id: priceId },
                            data: obj
                        })
                    }
                }
            }
        }
    },
    subscriptionUpdated: async (data) => {
        const priceId     = data?.custom_data?.user?.price_id || null;
        const subscription  = await strapi.db.query('api::subscription.subscription').findOne({
            where: { subscription_id: data?.id, is_active: true }, 
            populate: {
                plan: {
                    select: ["id"]
                }
            }
        });
        const plan          = await strapi.db.query('api::plan.plan').findOne({
            where: { price_id: priceId }
        })
        const author        = await strapi.db.query('plugin::users-permissions.user').findOne({
            where: { id: data?.custom_data?.user?.id }
        })
        if (subscription && author && plan && subscription?.plan?.id !== plan.id && data?.current_billing_period) {
            await strapi.db.query('api::subscription.subscription').update({
                where: { id: subscription.id, is_active: true },
                data: {
                    status: "inactive",
                    is_active: false,
                }
            })
            const newSubscriptions = await strapi.entityService.create('api::subscription.subscription', {
                data: {
                    plan: plan.id,
                    author: author.id || null,
                    tenure: data?.billing_cycle?.interval && data?.billing_cycle?.interval === "month" ? "Monthly" : "Yearly",
                    subscription_id: data?.id || null,
                    start_at: data?.current_billing_period?.starts_at,
                    end_at: data?.current_billing_period?.ends_at,
                    customer_id: data?.customer_id,
                    subscriber_email: data?.custom_data?.user?.email,
                    is_active: true,
                    status: data.status,
                    transaction_id: subscription?.transaction_id || null,
                    canceled_at: null,
                    publishedAt: new Date().toISOString()
                }
            })
            await strapi.db.query('api::transaction.transaction').update({ 
                where: { transaction_id: subscription?.transaction_id, price_id: priceId },
                data: {
                    subscription_id: data?.id,
                    subscription: newSubscriptions.id
                } 
            });
            await strapi.service('api::plan-service.migrate-user-service').upgradeToNewPlan(author, subscription?.plan, plan, newSubscriptions)
            const userService = getService('users-permissions');
            const message     = await userService.template(CHANGE_SUBSCRIPTION_EMAIL, {
                USER: { 
                    name: author.firstname && author.lastname ? `${author.firstname} ${author.lastname}` : author.username
                }
            });
            const subject     = await userService.template("Your subscription has changed!", {});
            strapi
                .plugin('email')
                .service('email')
                .send({
                    to: author?.email,
                    from: `CurateIt <${process.env.AWS_EMAIL_FROM}>`,
                    replyTo: process.env.AWS_EMAIL_REPLY_TO,
                    subject,
                    text: message,
                    html: message,
                });
        }
        else if (data?.scheduled_change) {
            await strapi.db.query('api::subscription.subscription').update({
                where: { id: subscription.id },
                data: {
                    scheduled_change: data?.scheduled_change
                }
            })
        }
    },
    subscriptionActivated: async (data) => {
        const priceId     = data?.custom_data?.user?.price_id || null;
        if (priceId) {
            const subscription  = await strapi.db.query('api::subscription.subscription').findOne({
                where: { subscription_id: data?.id, is_active: true } 
            });
            if (subscription) return
            const plan          = await strapi.db.query('api::plan.plan').findOne({ 
                where: {
                    price_id: priceId
                }
            });
            const author        = await strapi.db.query('plugin::users-permissions.user').findOne({
                where: { id: data?.custom_data?.user?.id }
            })
            const suscription   = await strapi.entityService.create('api::subscription.subscription', {
                data: {
                    plan: plan.id,
                    author: author.id || null,
                    tenure: data?.billing_cycle?.interval && data?.billing_cycle?.interval === "month" ? "Monthly" : "Yearly",
                    subscription_id: data?.id || null,
                    start_at: data?.current_billing_period?.starts_at,
                    end_at: data?.current_billing_period?.ends_at,
                    customer_id: data?.customer_id,
                    subscriber_email: data?.custom_data?.user?.email,
                    is_active: true,
                    status: data.status,
                    transaction_id: data.transaction_id,
                    canceled_at: null,
                    publishedAt: new Date().toISOString()
                }
            })
            await strapi.db.query('api::transaction.transaction').update({ 
                where: { transaction_id: data?.transaction_id, price_id: priceId },
                data: {
                    subscription_id: data?.id,
                    subscription: suscription.id
                } 
            });
            if (suscription && plan && author) {
                await strapi.service('api::plan-service.migrate-user-service').updatePlanServiceAccordingToUser(plan, author, suscription)
                const userService = getService('users-permissions');
                const message     = await userService.template(SUBSCRIBED_EMAIL, {
                    USER: { 
                        name: author.firstname && author.lastname ? `${author.firstname} ${author.lastname}` : author.username,
                        subscription: `${plan.display_name}/${plan.tenure}`
                    }
                });
                const subject     = await userService.template("You're now subscribed!", {});
                strapi
                    .plugin('email')
                    .service('email')
                    .send({
                        to: author?.email,
                        from: `CurateIt <${process.env.AWS_EMAIL_FROM}>`,
                        replyTo: process.env.AWS_EMAIL_REPLY_TO,
                        subject,
                        text: message,
                        html: message,
                    });
            }
        }  
    },
    subscriptionCanceled: async (data) => {
        const subscription = await strapi.db.query('api::subscription.subscription').update({
            where: { subscription_id: data?.id, is_active: true },
            data: {
                status: data.status,
                is_active: false,
                canceled_at: data.canceled_at
            },
            populate: {
                author: true,
                plan: true
            }
        })
        if (subscription && subscription?.author && subscription?.plan) {
            await strapi.service('api::plan-service.migrate-user-service').cancelOrPaymentFailed(subscription?.author, subscription?.plan, null)
            const userService = getService('users-permissions');
            const message     = await userService.template(CANCEL_SUBSCRIPTION_EMAIL, {
                USER: { name: subscription?.author?.firstname && subscription?.author?.lastname ? `${subscription?.author?.firstname} ${subscription?.author?.lastname}` : subscription?.author?.username },
                URL: `${process.env.REDIRECT_URI}/u/${subscription?.author?.username}/edit-profile?billing=true`
            });
            const subject     = await userService.template("Your subscription has wrapped up!", {});
            strapi
                .plugin('email')
                .service('email')
                .send({
                    to: subscription?.author?.email,
                    from: `CurateIt <${process.env.AWS_EMAIL_FROM}>`,
                    replyTo: process.env.AWS_EMAIL_REPLY_TO,
                    subject,
                    text: message,
                    html: message,
                });
        }
    },
    subscriptionCreated: async (data) => {
        const priceId       = data?.custom_data?.user?.price_id || null;
        const suscription   = await strapi.db.query('api::subscription.subscription').update({ 
            where: { subscription_id: data?.id, is_active: true },
            data: {
                transaction_id: data?.transaction_id
            } 
        });
        if (suscription && priceId) {
            await strapi.db.query('api::transaction.transaction').update({ 
                where: { transaction_id: data?.transaction_id, price_id: priceId },
                data: {
                    subscription_id: data?.id,
                    subscription: suscription.id
                } 
            });
        }
    }
}));
