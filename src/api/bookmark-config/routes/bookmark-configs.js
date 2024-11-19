module.exports = {
    routes : [
        { 
          method: 'GET',
          path: '/get-bookmark-configs',
          handler: 'bookmark-config.getBookmarkConfig',
        },
        { 
           method: 'PUT',
           path: '/change-bookmark-configs',
           handler: 'bookmark-config.changeBookmarkConfig',
        },
        { 
          method: 'PUT',
          path: '/config-coll-setting',
          handler: 'bookmark-config.addCollConfigSetting',
       }
    ]
}