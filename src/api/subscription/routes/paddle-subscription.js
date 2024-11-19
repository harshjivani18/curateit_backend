module.exports ={
    routes: [
        {
            method: 'POST',
            path: '/cancel-subscription/:subscriptionId',
            handler: 'paddle-subscription.paddleCancelSubscription'
        },
        {
            method: 'PATCH',
            path: '/change-subscription/:subscriptionId',
            handler: 'paddle-subscription.paddleChangePlan'
        },
        {
            method: 'GET',
            path: '/invoice-pdf/:invoiceId',
            handler: 'paddle-subscription.getInvoicePDF'
        },
        {
            method: 'PATCH',
            path: '/customers-billed-info/:customer_id',
            handler: 'paddle-subscription.updateBilledEmailAddress'
        },
        {
            method: "POST",
            path: "/fetch-pricing-preview/:subscriptionId",
            handler: "paddle-subscription.fetchPricingPreview"
        },
        {
            method: 'GET',
            path: '/get-update-payment-method-transaction/:subscriptionId',
            handler: 'paddle-subscription.getUpdatePaymentMethodTransaction'
        }
    ]
}