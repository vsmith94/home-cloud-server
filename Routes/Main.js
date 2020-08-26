const e = require('express');
const { Router } = require('express');
const route = e.Router();

route.get('/', (req, res) => {
    res.sendFile("../public/index.html");
});

module.exports = route;