module.exports = {
    routes: [
        {
            method: 'GET',
            path: '/set-raindrop-token',
            handler: 'third-party-token.setRaindropToken'
        },
        {
            method: 'GET',
            path: '/set-zoho-token',
            handler: 'third-party-token.setZohoToken'
        },
        {
            method: 'GET',
            path: '/multiple-raindrops',
            handler: 'third-party-token.importRaindrops'
        },
        {
            method: 'GET',
            path: '/raindrop/highlights',
            handler: 'third-party-token.importRaindropHighlights'
        },
        {
            method: 'GET',
            path: '/raindrop/get-raindrop-access-token',
            handler: 'third-party-token.getRaindropAccessToken'
        },
        {
            method: 'POST',
            path: '/import/raindrop-highlights',
            handler: 'third-party-token.addRaindropHighlights',
            config: {
                middlewares: ["api::gem.plan-service"],
            },
        },
        {
         method: 'GET',
         path: '/get-pocket-request-token',
         handler: 'third-party-token.getPocketRequestToken'
        },
        {
         method: 'POST',
         path: '/get-pocket-access-token',
         handler: 'third-party-token.getPocketAccessToken'
        },
        {
         method: 'POST',
         path: '/pocket-data-save',
         handler: 'third-party-token.pocketDataSync',
         config: {
            middlewares: ["api::gem.plan-service"],
          },
        },
        {
            method: 'POST',
            path: '/set-insta-access-token',
            handler: 'third-party-token.setInstaAccessToken',
        },
    ],
}