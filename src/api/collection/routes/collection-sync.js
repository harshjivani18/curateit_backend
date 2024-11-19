module.exports = {
    routes: [
        {
            method: 'GET',
            path: '/get-user-sync-data', // Pass
            handler: 'collection-sync.getUserSyncData'
        }
    ]
}