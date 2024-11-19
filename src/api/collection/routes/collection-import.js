module.exports = {
    routes: [
        {
            method: 'POST',
            path: '/collection-import', // Pass
            handler: 'collection-import.collectionImport', 
        },
    ]
}