
const e = require('express');

const app = e();

app.use(e.json());
app.use(e.urlencoded({ extended: false }));

app.use(e.static('./public'));
app.use('/', require('./Routes/Main'));
app.use('/api', require('./Routes/api/files'));



app.listen(7777);