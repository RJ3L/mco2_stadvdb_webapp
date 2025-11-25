const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const db = require("./models/db.js")
const syncUtils = require("./models/sync.js")

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

async function testMasterSync(){
    let res = await syncUtils.syncMaster()
    console.log(res)
}
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    testSelect("WHERE tconst = 'testLogs'", "", 2004, 2004, 1);
    //let insertQuery = "VALUES ('testLogs','movie','Movie Star','Movie Star',0,2004,NULL,120,'Action,Drama');"
    //testInsert(insertQuery, 2004, 2)
    //testMasterSync()
})