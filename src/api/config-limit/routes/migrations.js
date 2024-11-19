module.exports = {
    routes : [
       { 
          method: 'POST',
          path: '/config-migrate-records',
          handler: 'config-limit.migrateRecords',
       }
    ]
}