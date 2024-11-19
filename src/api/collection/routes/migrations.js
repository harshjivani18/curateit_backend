module.exports = {
    routes: [
        {
            method: "GET",
            path: "/migrate-site-config",
            handler: "migrations.migrateSiteConfig"
        }
    ]
}