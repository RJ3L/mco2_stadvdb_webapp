const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const db = require("./models/db.js")
const syncUtils = require("./models/sync.js")
const {nodeUtils} = require('./models/nodes.js');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


app.get('/', (req, res) => {
    res.send('Hello from the Node.js backend!');    
});

app.post('/api/read', async (req, res) => {
    const { id } = req.body; 

    try {
        console.log(`Reading Entry: ${id}`);
        const query = `WHERE tconst = '${id}'`;
        
        const result = await db.selectQuery(query, "LIMIT 1", 1900, 2100, 1);
        
        res.status(200).json({ message: 'Read successful', result: result }); 
    } catch (error) {
        console.error("Read Error:", error);
        res.status(500).json({ message: 'Read failed', error: error.message });
    }
});

app.post('/api/insert', async (req, res) => {
    const {tconst, titleType, primaryTitle, originalTitle, isAdult, startYear, endYear, runtimeMinutes, genres} = req.body;
    const insertQuery = `VALUES ('${tconst}', '${titleType}', '${primaryTitle}', '${originalTitle}', ${isAdult}, ${startYear}, ${endYear}, ${runtimeMinutes}, '${genres}');`;

    try {
        console.log("Inserting Query...");
        const result = await db.insertQuery(insertQuery, parseInt(startYear), 1);
        res.status(200).json({ message: 'Insert successful', result: result }); //200 ok
    } catch (error) {
        res.status(500).json({ message: 'Insert failed', error: error.message }); //400 bad request
    }
});

app.post('/api/update', async (req, res) => {
    const {tconst, titleType, primaryTitle, originalTitle, isAdult, startYear, endYear, runtimeMinutes, genres} = req.body;
    //isAdult=0, runtime=120
    const updateQuery = `${titleType}, ${primaryTitle}, ${originalTitle}, ${isAdult}, ${startYear}, ${endYear}, ${runtimeMinutes}, ${genres}`;
    try {
        console.log("Updating Query...");
        const result = await db.updateQuery(updateQuery, tconst, parseInt(startYear), 1);
        res.status(200).json({ message: 'Update successful', result: result }); //200 ok
    } catch (error) {
        res.status(500).json({ message: 'Update failed', error: error.message }); //400 bad request
    }
});

app.post('/api/delete', async (req, res) => {
    const { id, year } = req.body;

    try {
        console.log("Deleting Query...");
        const result = await db.deleteQuery(id, parseInt(year), 1);
        res.status(200).json({ message: 'Delete successful', result: result });
    } catch (error) {
        res.status(500).json({ message: 'Delete failed', error: error.message });
    }
});

app.get('/api/database', async (req, res) => {
    try {
        const result = await db.selectQuery("", "ORDER BY tconst ASC LIMIT 10", 1900, 2100, 1);
        console.log("DB Result Preview:", result[0]);
        
        if (result) {
            res.status(200).json(result); 
        } else {
            res.status(200).json([]); 
        }
    } catch (error) {
        console.error("Error fetching table data:", error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/pingNode/:nodeNum', async (req, res) => {
    const nodeNum = parseInt(req.params.nodeNum);
    try {
        console.log(`Pinging Node ${nodeNum}...`);
        let isAlive = false;    
        if (nodeNum === 1) {
            isAlive = await nodeUtils.pingNode(1);
        }
        else if (nodeNum === 2) {
            isAlive = await nodeUtils.pingNode(2);
        }
        else if (nodeNum === 3) {
            isAlive = await nodeUtils.pingNode(3);
        } else {
            return res.status(400).json({ message: 'Invalid node number' });
        }   
        res.status(200).json({ node: nodeNum, alive: isAlive });
    } catch (error) {
        res.status(500).json({ message: 'Ping failed', error: error.message });
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
});
