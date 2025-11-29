const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const db = require("./models/db.js");
const syncUtils = require("./models/sync.js");

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

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
