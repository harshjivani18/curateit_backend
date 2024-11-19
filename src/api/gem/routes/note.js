module.exports = {
    routes: [
        {
            method: 'POST',
            path: '/enhanced-text',  // no ned to apply middleware because only getting details with the third party
            handler: 'note.noteEnhancedText', 
        }
    ]
}