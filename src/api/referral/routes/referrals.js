module.exports = {
    routes: [
        { 
            method: 'POST',
            path: '/invite-user',
            handler: 'referral.inviteUsers',
        },
        { 
            method: 'GET',
            path: '/referral-users',
            handler: 'referral.getReferral',
        },
    ]
}