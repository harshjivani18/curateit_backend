module.exports = {
    routes: [
        { // Path defined with an URL parameter
            method: 'POST',
            path: '/following-users',
            handler: 'follower.followingUserColl',
        },
        { // Path defined with an URL parameter
            method: 'POST',
            path: '/unfollowing-users',
            handler: 'follower.unFollowingUserColl',
        },
        { // Path defined with an URL parameter
            method: 'GET',
            path: '/follower-list',
            handler: 'follower.followerFollowingList',
        },
        {
            method: 'GET',
            path: '/followed-by-me',
            handler: 'follower.followByMeCollection',
        },
    ]
}