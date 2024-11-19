module.exports = {
    routes: [
        { 
            method: 'POST',
            path: '/migrations-referral',
            handler: 'migrations.updateUserReferral',
        },
    ]
}