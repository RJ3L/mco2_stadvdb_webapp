import {node1, node2, node3, nodeUtils} from './nodes.js'; 
import transactionUtils from './transactions.js'; 
import * as dbNode1 from './db_node1.js';
import * as dbNode2 from './db_node2.js';

let isolationLevel = "REPEATABLE READ";

let node3Logs = [];
let numRows = 0;

let syncList = [];
let syncCount = 0;

export async function getNodeInfo() {
    try {
        let connection = await nodeUtils.getConnection(1);
        const [rows] = await connection.query('SELECT * FROM node_1');
        node3Logs = rows;
    } catch (error) {
        let connection1 = await nodeUtils.getConnection(2);
        let connection2 = await nodeUtils.getConnection(3);
        const [results1] = await connection1.query('SELECT * FROM node_2');
        const [results2] = await connection2.query('SELECT * FROM node_3');
        node3Logs = [...results1, ...results2];
    }
    numRows = node3Logs.length;
    applySyncList();
    return node3Logs;
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
    let check1 = dbNode1.getSyncList();
    let check2 = dbNode2.getSyncList();
    if(!check1 && !check2) {
        return true;
    } else {
        return false;
    }
}

export async function getSingleTitle(data) {
    const index = node3Logs.findIndex(log => String(log.tconst) === String(data.id));
    const result = node3Logs[index];
    return result;
}

export async function selectQuery() {
    return node3Logs; 
}

export async function updateQuery(data) { 
    if(isolationLevel !== 'SERIALIZABLE' || checkSerializeable()) {
        if (node3Logs.length === 0) {
            console.warn("Warning: node3Logs is empty. Did you run getNodeInfo() first?");
            return;
        }

        const index = node3Logs.findIndex(log => String(log.tconst) === String(data.tconst));

        if (index !== -1) {
            console.log("Found item to update:", node3Logs[index]);
            node3Logs[index] = { ...node3Logs[index], ...data }; 

            console.log(`Successfully updated tconst: ${data.tconst}`);
            console.log("New state:", node3Logs[index]);
        } else {
            console.log(`tconst not found: ${data.tconst}`);
        }
        syncList[syncCount] = {type:"UPDATE", data: data};
        syncCount++;

        if(isolationLevel == "READ UNCOMMITED") {
            dbNode1.updateQuery(data);
            dbNode2.updateQuery(data);
        }
    } else {
        const errorMessage = "Transaction Aborted: Serialization conflict detected.";
        console.error(errorMessage); 
        throw new Error(errorMessage);
    }
    
}

export async function insertQuery(insertData) {
    if(isolationLevel !== 'SERIALIZABLE' || checkSerializeable()) {
    node3Logs.push(insertData);
    console.log(`Successfully inserted tconst: ${insertData.tconst}`);
    syncList[syncCount] = {type:"INSERT", data: insertData};
    syncCount++;
    console.log(syncList[0]);

    
    if(isolationLevel == "READ UNCOMMITED") {
        dbNode1.insertQuery(insertData);
        dbNode2.insertQuery(insertData);
    }
    } else {
        const errorMessage = "Transaction Aborted: Serialization conflict detected.";
        console.error(errorMessage); 
        throw new Error(errorMessage);
    }
}

export async function deleteQuery(tconst) {
    if(isolationLevel !== 'SERIALIZABLE' || checkSerializeable()) {
    const index = node3Logs.findIndex(log => String(log.tconst) === String(tconst.id));
    if (index !== -1) {
        node3Logs.splice(index, 1);
        console.log(`Successfully deleted tconst: ${tconst.id}`);
    } else {
        console.log(`tconst not found for deletion: ${tconst.id}`);
    }
    syncList[syncCount] = {type:"DELETE", data: tconst};
    console.log(syncList[syncCount]);
    syncCount++;

    if(isolationLevel == "READ UNCOMMITED") {
        dbNode1.deleteQuery(tconst);
        dbNode2.deleteQuery(tconst);
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
        dbNode1.setIsolationLevel(level);
        dbNode2.setIsolationLevel(level);
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
        dbNode1.getNodeInfo();
        dbNode2.getNodeInfo();
    }
    getNodeInfo();
}