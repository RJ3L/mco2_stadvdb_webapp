const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3002;
const db = require("./models/db.js")
const syncUtils = require("./models/sync.js")

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.send('Hello from the Node.js backend!');    
});

//Reference: https://expressjs.com/en/5x/api.html
app.post('/api/select', async (req, res) => {
    const { query, limit, fromYear, toYear, node, isolationLevel } = req.body;
    try {
        console.log(`[Select] Node: ${node} | Isolation level: ${isolationLevel || 'Default'}`);
        const result = await db.selectQuery(query, limit, parseInt(fromYear), parseInt(toYear), parseInt(node), 3, isolationLevel);
        res.status(200).json({ message: 'Select successful', result: result }); 
    } catch (error) {
        res.status(500).json({ message: 'Select failed', error: error.message }); 
    }
});

app.post('/api/read', async (req, res) => {
    const {id, year, isolationLevel} = req.body;
    try {
        console.log(`[Read] ID: ${id} | Isolation level: ${isolationLevel}`);
        let query = `WHERE tconst = '${id}'`;
        if (year) {
            query += ` AND startYear = ${year}`;
        }
        // Use selectQuery to fetch data
        const yearInt = year ? parseInt(year) : null;
        const result = await db.selectQuery(query, "LIMIT 1", yearInt, yearInt, 3, isolationLevel);
        res.status(200).json({ message: 'Read successful', result: result });
    } catch (error) {
        res.status(500).json({ message: 'Read failed', error: error.message }); 
    }
});

app.post('/api/insert', async (req, res) => {
    const {tconst, titleType, primaryTitle, originalTitle, isAdult, startYear, endYear, runtimeMinutes, genres} = req.body;
    const insertQuery = `VALUES ('${tconst}', '${titleType}', '${primaryTitle}', '${originalTitle}', ${isAdult}, ${startYear}, ${endYear}, ${runtimeMinutes}, '${genres}');`;

    try {
        console.log("Inserting Query...");
        const result = await db.insertQuery(insertQuery, parseInt(startYear), 3);
        res.status(200).json({ message: 'Insert successful', result: result }); //200 ok
    } catch (error) {
        res.status(500).json({ message: 'Insert failed', error: error.message }); //400 bad request
    }
});

app.post('/api/update', async (req, res) => {
    const {
        tconst, titleType, primaryTitle, originalTitle, isAdult, 
        startYear, endYear, runtimeMinutes, genres,
        isolationLevel, isDemoMode 
    } = req.body;

    const updateQuery = `${titleType}, ${primaryTitle}, ${originalTitle}, ${isAdult}, ${startYear}, ${endYear}, ${runtimeMinutes}, ${genres}`;
    try {
        console.log(`[Update] Demo: ${isDemoMode} | Isolation level: ${isolationLevel}`);
        const result = await db.updateQuery(
            updateQuery, tconst, parseInt(startYear), 1, 
            isolationLevel, isDemoMode
        );
        res.status(200).json({ message: 'Update successful', result: result }); 
    } catch (error) {
        res.status(500).json({ message: 'Update failed', error: error.message }); 
    }
});

app.post('/api/delete', async (req, res) => {
    const {id, year} = req.body;
    try {
        console.log(`[Delete] ${id}`);
        const result = await db.deleteQuery(id, parseInt(year), 3);
        res.status(200).json({ message: 'Delete successful', result: result }); 
    } catch (error) {
        res.status(500).json({ message: 'Delete failed', error: error.message }); 
    }
});

// SYNC API
app.post('/api/sync', async (req, res) => {
    try {
        console.log("[Sync] Starting...");
        await syncUtils.syncMaster();
        await syncUtils.syncFragment(2);
        await syncUtils.syncFragment(3);
        res.status(200).json({ message: 'Sync Complete' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Sync failed', error: error.message });
    }
});

// FETCH TABLE DATA API
app.get('/api/database', async (req, res) => {
    try {
        const result = await db.selectQuery("", "LIMIT 20", 1900, 2100, 3);
        res.status(200).json(result || []); 
    } catch (error) {
        res.status(500).json({ error: error.message });
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
    //let insertQuery = "VALUES ('NODE22','movie','Movie Star','Movie Star',0,2004,NULL,120,'Action,Drama');"
    //testInsert(insertQuery, 2004, 2)
    //testMasterSync()
    //testDelete("tt9698274", 2004, 1)
    //testUpdate("try, hi, hi, 1, 2004, 2010, 60, romance" , "ttTEST001", 2004, 1)
    //testFragSync(2)
})
