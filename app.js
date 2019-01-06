const express = require('express'),
    app = express(),
    port = 3000
    ;

app
.use('/public', express.static('public'))
.get('/', (req, res) =>
{
    res.sendFile(__dirname + '/index.html');
})
.listen(port, () =>
{
    console.log(`Minecraft listening on port ${port}!`);
});