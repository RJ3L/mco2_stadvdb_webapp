const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const db = require("./models/db.js")
const syncUtils = require("./models/sync.js")

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.send('Hello from the Node.js backend!');    
});

//Reference: https://expressjs.com/en/5x/api.html
app.post('/api/select', async (req, res) => {
    const {query, limit, fromYear, toYear, node} = req.body;

    try {
        console.log("Selecting Query...");
        const result = await db.selectQuery(query, limit, parseInt(fromYear), parseInt(toYear), parseInt(node));
        res.status(200).json({ message: 'Select successful', result: result }); //200 ok
    } catch (error) {
        res.status(500).json({ message: 'Select failed', error: error.message }); //400 bad request
    }
});

app.post('/api/insert', async (req, res) => {
    const {id, title, year, genre} = req.body;

    //isAdult=0, runtime=120
    const insertQuery = `VALUES ('${id}','movie','${title}','${title}',0,${year},NULL,120,'${genre}');`
    try {
        console.log("Inserting Query...");
        const result = await db.insertQuery(insertQuery, parseInt(year), 1);
        res.status(200).json({ message: 'Insert successful', result: result }); //200 ok
    } catch (error) {
        res.status(500).json({ message: 'Insert failed', error: error.message }); //400 bad request
    }
});

app.post('/api/update', async (req, res) => {
    const {id, title, year, genre} = req.body;

    //isAdult=0, runtime=120
    const updateQuery = `movie, ${title}, ${title}, 0, ${year}, NULL, 120, ${genre}`;
    try {
        console.log("Updating Query...");
        const result = await db.updateQuery(updateQuery, id, parseInt(year), 1);
        res.status(200).json({ message: 'Update successful', result: result }); //200 ok
    } catch (error) {
        res.status(500).json({ message: 'Update failed', error: error.message }); //400 bad request
    }
});

app.post('/api/delete', async (req, res) => {
    const {id, year} = req.body;

    try {
        console.log("Deleting Query...");
        const result = await db.deleteQuery(id, parseInt(year), 1);
        res.status(200).json({ message: 'Delete successful', result: result }); //200 ok
    } catch (error) {
        res.status(500).json({ message: 'Delete failed', error: error.message }); //400 bad request
    }
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

async function testDelete(query, startYear, node){
    let res = await db.deleteQuery(query, startYear, node)
    console.log("Result: " + res)
}

async function testMasterSync(){
    let res = await syncUtils.syncMaster()
    console.log(res)
}
async function testFragSync(node){
    let res = await syncUtils.syncFragment(node)
    console.log(res)
}
async function testUpdate(valuesQuery, tconst, year, node){
    let res = await db.updateQuery(valuesQuery, tconst, year, node)
    console.log("Result: " + res)
}
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    //testSelect("WHERE tconst = 'NODE2'", "", 2004, 2004, 2);
    //let insertQuery = "VALUES ('NODE2','movie','Movie Star','Movie Star',0,2004,NULL,120,'Action,Drama');"
    //testInsert(insertQuery, 2004, 2)
    //testMasterSync()
    //testDelete("tt9698274", 2004, 1)
    //testUpdate("try, hi, hi, 1, 2004, 2010, 60, romance" , "ttTEST001", 2004, 1)
    testFragSync(2)
})
