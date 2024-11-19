'use strict';

const { default: axios } = require('axios');
const moment = require('moment/moment');

/**
 * subscription service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::subscription.subscription', ({ strapi }) => ({ 
    async cancelSubscriptionPaddle(subscriptionId) {
        try {
            // call paddle api with axios
            const res = await axios.post(`${process.env.PADDLE_BASE_URL}/subscriptions/${subscriptionId}/cancel`, {
                "effective_from": "next_billing_period"
            }, {
                headers: {
                    "Authorization": `Bearer ${process.env.PADDLE_API_KEY}`,
                }
            })
            return res.data
        }
        catch (err) {
            console.log('err', err.response.data.error)
            return { status: 400, error: err.response.data.error }
        }
    },
    async changePlanPaddle(subscriptionId, newPlanId, user) {
        try {
            // call paddle api with axios
            const res = await axios.patch(`${process.env.PADDLE_BASE_URL}/subscriptions/${subscriptionId}`, {
                "proration_billing_mode": "prorated_immediately",
                "items": [
                    {
                        "price_id": newPlanId,
                        "quantity": 1
                    }
                ],
                "custom_data": {
                    "user": {
                        "id": user.id,
                        "email": user.email,
                        "username": user.username,
                        "price_id": newPlanId
                    }
                }
            }, {
                headers: {
                    "Authorization": `Bearer ${process.env.PADDLE_API_KEY}`,
                }
            })
            return res.data
        }
        catch (err) {
            console.log('err', err.response.data.error)
            return { status: 400, error: err.response.data.error }
        }
    },
    async getInvoicePDF(invoiceId) {
        try {
            console.log('invoiceId', invoiceId, process.env.PADDLE_API_KEY)
            console.log('Date', moment().utc().add(1, 'day').toISOString())
            const invoiceData = await axios.get(`${process.env.PADDLE_BASE_URL}/invoices/${invoiceId}/pdf`, {
                headers: {
                    "Authorization": `Bearer ${process.env.PADDLE_API_KEY}`,
                    "Expires": moment().utc().add(1, 'day').toISOString(),
                    "Paddle-Version": 1,
                    "Content-Type": "application/json"
                }
            })
            return invoiceData.data
        }
        catch (err) {
            console.log('err', err.response.data.error)
            return { status: 400, error: err.response.data.error }
        }
    },
    async updateCustomerBilledEmail(customerId, newEmail) {
        try {
            const res = await axios.patch(`${process.env.PADDLE_BASE_URL}/customers/${customerId}`, {
                "email": newEmail
            }, {
                headers: {
                    "Authorization": `Bearer ${process.env.PADDLE_API_KEY}`,
                }
            })
            await strapi.db.query('api::transaction.transaction').updateMany({
                where: {
                    customer_id: customerId
                },
                data: {
                    email: newEmail
                }
            })
            return res.data
        }
        catch (err) {
            console.log('err', err.response.data.error)
            return { status: 400, error: err.response.data.error }
        }
    },
    async fetchPricingPreview(subscriptionId, customerId, newPriceId) {
        try {
            const res = await axios.patch(`${process.env.PADDLE_BASE_URL}/subscriptions/${subscriptionId}/preview`, {
                "items": [
                    {
                        "price_id": newPriceId,
                        "quantity": 1
                    }
                ],
                "proration_billing_mode": "prorated_immediately"
            }, {
                headers: {
                    "Authorization": `Bearer ${process.env.PADDLE_API_KEY}`,
                }
            })
            return res.data
        }
        catch (err) {
            console.log('err', err.response.data.error)
            return { status: 400, error: err.response.data.error }
        } 
    },
    async getUpdatePaymentMethodURL(subscriptionId) {
        try {
            const res = await axios.get(`${process.env.PADDLE_BASE_URL}/subscriptions/${subscriptionId}/update-payment-method-transaction`, {
                headers: {
                    "Authorization": `Bearer ${process.env.PADDLE_API_KEY}`
                }
            })
            return res?.data?.data?.id
        }
        catch (err) {
            console.log('err', err.response.data.error)
            return { status: 400, error: err.response.data.error }
        }
    }
}));
