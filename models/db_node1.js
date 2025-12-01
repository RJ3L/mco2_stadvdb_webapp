import {node1, node2, node3, nodeUtils} from './nodes.js'; 
import transactionUtils from './transactions.js'; 

let node1Logs = [];
let numRows = 0;

function Procedure(type, data) {
  this.type = type;
  this.data = data;
}

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
}

export async function selectQuery() {
    return node1Logs; 
}

export async function updateQuery(data) { 
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
}

export async function insertQuery(insertData) {
    node1Logs.push(insertData);
    console.log(`Successfully inserted tconst: ${insertData.tconst}`);
    syncList[syncCount] = {type:"INSERT", data: insertData};
    syncCount++;

    console.log(syncList[0]);
}

export async function deleteQuery(tconst) {
    const index = node1Logs.findIndex(log => String(log.tconst) === String(tconst));
    if (index !== -1) {
        node1Logs.splice(index, 1);
        console.log(`Successfully deleted tconst: ${tconst}`);
    } else {
        console.log(`tconst not found for deletion: ${tconst}`);
    }
}

export async function syncData() {
    for(let i = 0; i < syncList.length; i++) {
        let currentItem = syncList[i];
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

        } else if(syncList[i].type =="DELETE") {

        }
    }
}