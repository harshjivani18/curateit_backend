module.exports = {
    routes: [
        {
            method: 'POST',
            path: '/store-url-image', // It is getting data using logged in user only so there is no need to validate the permission over here
            handler: 'store-image-from-url.storeImageUsingURL', 
        }
    ]
}
