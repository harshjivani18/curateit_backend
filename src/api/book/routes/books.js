module.exports = {
    routes: [
        {
            method: 'GET',
            path: '/book-list', // It is returning book information from the google apis so no need to validate the permissions
            handler: 'book.getBookByName',
        },
        {
            method: 'GET',
            path: '/book-details', // It is returning book information from the google apis so no need to validate the permissions
            handler: 'book.createBookGem',
        },
        {
            method: 'GET',
            path: '/bookgems', // It is returning the book data from the logged in user only so no need to validate the permissions
            handler: 'book.getAllBook',
        },
        {
            method: 'GET',
            path: '/collections/:collectionId/bookgems/:gemId', // Not in use please remove permissions from the CMS
            handler: 'book.getBookById',
        },
        {
            method: 'PUT',
            path: '/collections/:collectionId/moviegems/:gemId', // Not in use please remove permissions from the CMS
            handler: 'book.updateBook',
        },
        {
            method: 'DELETE',
            path: '/collections/:collectionId/bookgems/:gemId', // Not in use please remove permissions from the CMS
            handler: 'book.deleteBook',
        },
    ]
}