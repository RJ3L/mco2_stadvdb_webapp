const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const db = require("./models/db.js")

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.send('Hello from the Node.js backend!');    
});

/* 
    Query: WHERE = ...
    Limit: LIMIT ...
*/
async function testSelect(query, limit, from, to, node){
    let res = await db.selectQuery(query, limit, from, to, node)
    console.log("Result: " + JSON.stringify(res))
}

/*
    Query: VALUES(...)
*/
async function testInsert(query, startYear, node){
    let res = await db.insertQuery(query, startYear, node)
    console.log("Result: " + res)
}
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    //testSelect("WHERE startYear = 2009", "", 2009, 2009, 2);
    let insertQuery = "VALUES ('tt1234567','movie','Nicole is a Movie Star','Nicole is a Movie Star',0,2014,NULL,120,'Action,Drama');"
    testInsert(insertQuery, 2014, 1)
})