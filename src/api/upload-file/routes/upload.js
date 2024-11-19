module.exports = {
    routes : [
        {
            method: 'POST',
            path: '/upload', // Need to revalidate this api because upload file is not considering any collection for creating gem so no permissions check required
            handler: 'upload-file.uploadFile',
            config: {
              policies: [],
              middlewares: [],
            },
        },
        {
            method: 'POST',
            path: '/uploadfile', // Not creating any gem or referencing collection so not required any permission checks
            handler: 'upload-file.uploadFileWithBuffer',
            config: {
              policies: [],
              middlewares: [],
            },
        },
        {
            method: 'DELETE',
            path: '/files', // Not referncing any collection or gem so not required any permission checks
            handler: 'upload-file.deleteFile',
            config: {
                policies: [],
                middlewares: [],
            },
        },
        {
            method: 'POST',
            path: '/icon', // Not refrencing any gem or collection so it is not require any permission checks
            handler: 'upload-file.uploadIcon',
            config: {
                policies: [],
                middlewares: [],
            },
        },
        {
            method: 'POST',
            path: '/sidebar-icon', // Not refrencing any gem or collection so it is not require any permission checks
            handler: 'upload-file.sidebarIcon',
        },
        {
            method: "POST",
            path: "/upload-base64-img", // Not refrencing any gem or collection so it is not require any permission checks
            handler: "upload-file.uploadBase64Img",
        },
        {
            method: "POST",
            path: "/upload-all-file", // Not refrencing any gem or collection so it is not require any permission checks
            handler: "upload-file.uploadAllFiles",
        }
    ]
}

