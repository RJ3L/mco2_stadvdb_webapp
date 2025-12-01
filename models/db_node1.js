import {node1, node2, node3, nodeUtils} from './nodes.js'; 
import transactionUtils from './transactions.js'; 
import * as dbNode2 from './db_node2.js';
import * as dbNode3 from './db_node3.js';

let isolationLevel = "REPEATABLE READ";

let node1Logs = [];
let numRows = 0;

let syncList = [];
let syncCount = 0;

export async function getNodeInfo() {
    try {
        let connection = await nodeUtils.getConnection(1);
        const [rows] = await connection.query('SELECT * FROM node_1');
        node1Logs = rows;
    } catch (error) {
        let connection1 = await nodeUtils.getConnection(2);
        let connection2 = await nodeUtils.getConnection(3);
        const [results1] = await connection1.query('SELECT * FROM node_2');
        const [results2] = await connection2.query('SELECT * FROM node_3');
        node1Logs = [...results1, ...results2];
    }
    numRows = node1Logs.length;
    applySyncList();
    return node1Logs;
}

export async function applySyncList() {
    for(let i = 0; i < syncList.length; i++) {
        if(syncList[i].type == "INSERT") {
            insertQuery(syncList[i].data);
        } else if(syncList[i].type == "UPDATE") {
            updateQuery(syncList[i].data);
         } else if(syncList[i].type =="DELETE") {    
            deleteQuery(syncList[i].data);
        }
    }
}

export async function getSyncList() {
    return syncList.length;
}

export async function checkSerializeable() {
    let check1 = await dbNode2.getSyncList();
    let check2 = await dbNode3.getSyncList();
    if(!check1 && !check2) {
        return true;
    } else {
        return false;
    }
}

export async function getSingleTitle(data) {
    const index = node1Logs.findIndex(log => String(log.tconst) === String(data.id));
    const result = node1Logs[index];
    return result;
}

export async function selectQuery() {
    return node1Logs; 
}

export async function updateQuery(data) { 
    if(isolationLevel !== 'SERIALIZABLE' || checkSerializeable()) {
        if (node1Logs.length === 0) {
            console.warn("Warning: node1Logs is empty. Did you run getNodeInfo() first?");
            return;
        }

        const index = node1Logs.findIndex(log => String(log.tconst) === String(data.tconst));

        if (index !== -1) {
            console.log("Found item to update:", node1Logs[index]);
            node1Logs[index] = { ...node1Logs[index], ...data }; 

            console.log(`Successfully updated tconst: ${data.tconst}`);
            console.log("New state:", node1Logs[index]);
        } else {
            console.log(`tconst not found: ${data.tconst}`);
        }
        syncList[syncCount] = {type:"UPDATE", data: data};
        syncCount++;

        if(isolationLevel == "READ UNCOMMITED") {
            await dbNode2.updateQuery(data);
            await dbNode3.updateQuery(data);
        }
    } else {
        const errorMessage = "Transaction Aborted: Serialization conflict detected.";
        console.error(errorMessage); 
        throw new Error(errorMessage);
    }
    
}

export async function insertQuery(insertData) {
    if(isolationLevel !== 'SERIALIZABLE' || checkSerializeable()) {
    node1Logs.push(insertData);
    console.log(`Successfully inserted tconst: ${insertData.tconst}`);
    syncList[syncCount] = {type:"INSERT", data: insertData};
    syncCount++;
    console.log(syncList[0]);

    
    if(isolationLevel == "READ UNCOMMITED") {
        await dbNode2.insertQuery(insertData);
        await dbNode3.insertQuery(insertData);
    }
    } else {
        const errorMessage = "Transaction Aborted: Serialization conflict detected.";
        console.error(errorMessage); 
        throw new Error(errorMessage);
    }
}

export async function deleteQuery(tconst, isReplication = false) { 
    
    if(isolationLevel !== 'SERIALIZABLE' || checkSerializeable()) {
        const index = node1Logs.findIndex(log => String(log.tconst) === String(tconst.id));
        
        if (index !== -1) {
            node1Logs.splice(index, 1);
            console.log(`Successfully deleted tconst: ${tconst.id}`);
        } else {
            console.log(`tconst not found for deletion: ${tconst.id}`);
        }
        
        // Add to sync list regardless
        syncList[syncCount] = {type:"DELETE", data: tconst};
        syncCount++;

        // 2. Only propagate if this is NOT a replication call
        if(isolationLevel === "READ UNCOMMITTED" && !isReplication) {
            console.log("Broadcasting Dirty Read Delete...");
            // Pass 'true' to prevent infinite loop
            await dbNode2.deleteQuery(tconst, true); 
            await dbNode3.deleteQuery(tconst, true); 
        }
    } else {
        const errorMessage = "Transaction Aborted: Serialization conflict detected.";
        console.error(errorMessage); 
        throw new Error(errorMessage);
    }
}

export async function setIsolationLevel(level) {
    if(isolationLevel !== level.isolationLevel) {
        isolationLevel = level.isolationLevel;
        await dbNode2.setIsolationLevel(level);
        await dbNode3.setIsolationLevel(level);
    }
}

export async function syncData() {
    for(let i = 0; i < syncList.length; i++) {
        let currentItem = syncList[i];
            console.log('\n\n\n', syncList[i])
        if(syncList[i].type == "INSERT") {
            try {
                let baseQuery = "INSERT INTO "
                let tableQuery = " (tconst, titleType, primaryTitle, originalTitle, isAdult, startYear, endYear, runtimeMinutes, genres) "
                let valuesQuery = "VALUES ('" + currentItem.data.tconst + "','" + 
                    currentItem.data.titleType + "','" + 
                    currentItem.data.primaryTitle + "','" + 
                    currentItem.data.originalTitle + "'," + 
                    currentItem.data.isAdult + "," + 
                    currentItem.data.startYear + "," + 
                    (currentItem.data.endYear === null ? "NULL" : currentItem.data.endYear) + "," + 
                    currentItem.data.runtimeMinutes + ",'" + 
                    currentItem.data.genres + "');";
                let query = `
                START TRANSACTION;
                ${baseQuery} node_1 ${tableQuery} ${valuesQuery}
                COMMIT;`
                let result = await transactionUtils.doTransaction(1, query);
            } catch (error) {
                console.log(error);
            }
        } else if(syncList[i].type == "UPDATE") {
            try {
                let updateClause = " SET " + 
                "titleType = '" + currentItem.data.titleType  + "', " + 
                "primaryTitle = '" + currentItem.data.primaryTitle + "', " + 
                "originalTitle = '" + currentItem.data.originalTitle + "', " + 
                "isAdult = '" + currentItem.data.isAdult + "', " + 
                "startYear = '" + currentItem.data.startYear + "', " + 
                "endYear = " + (currentItem.data.endYear === null ? "NULL" : currentItem.data.endYear) + ", " + 
                "runtimeMinutes = '" + currentItem.data.runtimeMinutes + "', " + 
                "genres = '" + currentItem.data.genres + "' " + 
                "WHERE tconst = '" + currentItem.data.tconst + "';";

                let updateQuery = `
                START TRANSACTION;
                UPDATE node_1 ${updateClause}
                COMMIT;
                `
                let result = await transactionUtils.doMultiTransaction(1, updateQuery);
            } catch (error) {
                console.log(error)
            }
         } else if(syncList[i].type =="DELETE") {    
            let baseQuery = "DELETE FROM "
            let tableQuery = " WHERE tconst = '" + currentItem.data.id + "';"
            let deleteQuery = `
                START TRANSACTION;
                ${baseQuery} node_1 ${tableQuery}
                COMMIT;
            `
            let result = await transactionUtils.doMultiTransaction(1, deleteQuery);
        }
    }
    syncList = [];
    syncCount = 0;
    if(isolationLevel == "READ COMMITED") {
        await dbNode2.getNodeInfo();
        await dbNode3.getNodeInfo();
    }
    getNodeInfo();
}