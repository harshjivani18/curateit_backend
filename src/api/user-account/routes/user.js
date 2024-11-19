module.exports = {
    routes: [
        {
            method: 'GET',
            path: '/user-details',
            handler: 'user-account.userDetailsViaEmail'
        },
        {
            method: 'POST',
            path: '/set-twitter',
            handler: 'user-account.setUsertwitterId' // no for migrations
        },
        {
            method: 'GET', 
            path: '/user',
            handler: 'user-account.getUserViaUsername'
        },
        {
            method: 'GET',
            path: '/users/seo-details',
            handler: 'user-account.getUserSeoViaUsername'
        },
        {
            method: "POST",
            path: "/user/uninstalled",
            handler: "user-account.userUninstalled" // not form migrate
        },
        {
            method: "GET",
            path: "/migration",
            handler: "user-account.dataMigration"
        },
        {
            method: "GET",
            path: "/public-users",
            handler: "user-account.getUsers"
        },
        {
            method: "DELETE",
            path: "/delete-userdata",
            handler: "user-account.deleteUserData"
        },
        {
            method: "GET",
            path: "/username",
            handler: "user-account.usernameExist"
        },
        {
            method: "POST",
            path: "/block-sites",
            handler: "user-account.blockSites"
        },
        {
            method: "POST",
            path: "/remove-block-sites",
            handler: "user-account.deleteBlockSites"
        },
        {
            method: "GET",
            path: "/get-all-register-users",
            handler: "user-account.getAllUsers"
        },
        {
            method: "PATCH",
            path: "/set-user-sync-status",
            handler: "user-account.setUserSyncStatus"
        },
        {
            method: "POST",
            path: "/social-referral-track",
            handler: "user-account.socialLoginReferral"
        },
        {
            method: "GET",
            path: "/migrate-ai-settings",
            handler: "migrations.migrateAiSettings"
        },
        {
            method: "GET",
            path: "/migrate-ai-triggers",
            handler: "migrations.migrateAiTriggers"
        }
    ]
}