module.exports = {
    routes: [
        {
            method: 'GET',
            path: '/get-all-public-users',
            handler: 'super-admin-configuration.getAllPublicUsers', // Pass
        }
    ]
}
