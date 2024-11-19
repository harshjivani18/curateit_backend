module.exports ={
    routes: [
        {
            method: 'GET',
            path: '/get-gamification-scores',
            handler: 'gamification-score.getGamificationScore'
        },
        {
            method: 'GET',
            path: '/leaderboard-widget',
            handler: 'gamification-score.leaderboardWidget'
        },
        {
            method: 'PUT',
            path: '/gamification-score',
            handler: 'gamification-score.updateGamification'
        },
    ]
}