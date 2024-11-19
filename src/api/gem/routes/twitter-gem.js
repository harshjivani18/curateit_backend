// This file is not in used
module.exports = {
    routes: [
        {
            method: 'POST',
            path: '/fetch-twitter-bookmarks/:collectionId',
            handler: 'twitter-gem.importTweets', 
        },
        {
            method: 'GET',
            path: '/fetch-latest-tweet',
            handler: 'twitter-gem.fetchLatestTweets', 
        },
        {
            method: 'GET',
            path: '/twitter-gem/:gemId',
            handler: 'twitter-gem.getTwitterGem', 
        },
    ]
}
