module.exports = {
    routes : [
        { 
          method: 'GET',
          path: '/get-user-personas',
          handler: 'personas.getUserPersonas',
        },
        {
          method: 'POST',
          path: "/personas",
          handler: 'personas.createPersona'
        }
    ]
}