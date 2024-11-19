module.exports = {
    routes: [
        {
            method: "POST",
            path: "/insta-wall",
            handler: "insta-wall.createInstawall"
        },
        {
            method: "GET",
            path: "/insta-wall",
            handler: "insta-wall.getInstawall"
        }
    ]
}