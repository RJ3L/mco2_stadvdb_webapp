const {node1, node2, node3, nodeUtils} = require('./nodes.js'); 
const transactionUtils = require('./transactions.js'); 
const syncUtils = require('./sync.js'); 

const dbQueries = {
    selectQuery: async function (query, limit, fromYear, toYear, node, isolationLevel = 'REPEATABLE READ'){
        const runIsoQuery = async (targetNode, sql) => {
            const conn = await nodeUtils.getConnection(targetNode);
            try {
                await conn.query(`SET SESSION TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
                const [rows] = await conn.query(sql);
                return rows;
            } finally {
                conn.release();
            }
        };

        let sql = `SELECT * FROM node_${node} ` + query + ` ORDER BY startYear ` + limit;
        
        // Query from Node 1 Directly
        if (node == 1 && await nodeUtils.pingNode(1)){
            console.log(`DB Query: Select from Node 1 (${isolationLevel})`);
            return await runIsoQuery(1, sql);
        } else {
            // Sharding Logic
            if (toYear <= 2010 || toYear == null){
                if (await nodeUtils.pingNode(2)){
                    return await runIsoQuery(2, `SELECT * FROM node_2 ` + query + ` ORDER BY startYear ` + limit);
                } else if (await nodeUtils.pingNode(1)){
                    return await runIsoQuery(1, `SELECT * FROM node_1 ` + query + ` ORDER BY startYear ` + limit);
                }
            } else if (fromYear > 2010){
                if (await nodeUtils.pingNode(3)){
                    return await runIsoQuery(3, `SELECT * FROM node_3 ` + query + ` ORDER BY startYear ` + limit);
                } else if (await nodeUtils.pingNode(1)){
                    return await runIsoQuery(1, `SELECT * FROM node_1 ` + query + ` ORDER BY startYear ` + limit);
                }
            }
             else {
                // Range spans both nodes (Fallback to standard query for complex merge)
                if (await nodeUtils.pingNode(1)){
                    return await runIsoQuery(1, `SELECT * FROM node_1 ` + query + ` ORDER BY startYear ` + limit);
                } else if (await nodeUtils.pingNode(2) && await nodeUtils.pingNode(3)){
                    // Note: Transactions across multiple nodes are tricky, we just query normally here
                    const [movies2] = await node2.query(`SELECT * FROM node_2 ` + query + ` ORDER BY startYear`);
                    const [movies3] = await node3.query(`SELECT * FROM node_3 ` + query + ` ORDER BY startYear`);
                    return movies2.concat(movies3);
                }
            }
        }
    },
    insertQuery: async function (valuesQuery, startYear, node){
        let baseQuery = "INSERT INTO "
        let tableQuery = " (tconst, titleType, primaryTitle, originalTitle, isAdult, startYear, endYear, runtimeMinutes, genres) "
        
        if (node == 1 && await nodeUtils.pingNode(1)){
            const { node2Alive, node3Alive } = await nodeUtils.pingAllNodes();
            const node2StatusFlag = node2Alive ? 1 : 0;
            const node3StatusFlag = node3Alive ? 1 : 0;

            let query = `
                SET @NODE_2_ALIVE = ${node2StatusFlag};
                SET @NODE_3_ALIVE = ${node3StatusFlag};
                SET @REPLICATOR_SYNC = 0;
                START TRANSACTION;
                ${baseQuery} node_1 ${tableQuery} ${valuesQuery}
                COMMIT;
            `
            let result = await transactionUtils.doMultiTransaction(1, query)
            console.log("DB Query: Insert to Node 1")
            return result
        } else if ((startYear <= 2010 || startYear == null) && await nodeUtils.pingNode(2)){
            let query = baseQuery + "node_2" + tableQuery + valuesQuery
            console.log("DB Query: Insert to Node 2")
            let result = transactionUtils.doTransaction(2, query)
            return result
        } else if (startYear > 2010 && await nodeUtils.pingNode(3)){
            let query = baseQuery + "node_3" + tableQuery + valuesQuery
            console.log("DB Query: Insert to Node 3")
            let result = await transactionUtils.doTransaction(3, query)
            return result
        } else{
            console.log("DB Query: No nodes are available at this moment. Please try again later.")
        }
    },
    updateQuery: async function (valuesQuery, tconst, year, node, isolationLevel = 'REPEATABLE READ', simulateDelay = false){
        const headersArray = valuesQuery.split(',').map(item => item.trim());
        let genres = headersArray.slice(7).join(',');
        let baseQuery = "UPDATE "
        let tableQuery = " SET " + 
            "titleType = '" + headersArray[0] + "', " + 
            "primaryTitle = '" + headersArray[1] + "', " + 
            "originalTitle = '" + headersArray[2] + "', " + 
            "isAdult = '" + headersArray[3] + "', " + 
            "startYear = '" + headersArray[4] + "', " + 
            "endYear = '" + headersArray[5] + "', " + 
            "runtimeMinutes = '" + headersArray[6] + "', " + 
            "genres = '" + genres + "' " + 
            "WHERE tconst = '" + tconst + "';";

            // NODE 1
        if (node == 1 && await nodeUtils.pingNode(1)){
            const { node2Alive, node3Alive } = await nodeUtils.pingAllNodes();
            const node2StatusFlag = node2Alive ? 1 : 0;
            const node3StatusFlag = node3Alive ? 1 : 0;

            let setupSql = `
                SET @NODE_2_ALIVE = ${node2StatusFlag};
                SET @NODE_3_ALIVE = ${node3StatusFlag};
                SET @REPLICATOR_SYNC = 0;
            `;
            let fullSql = `${baseQuery} node_1 ${tableQuery}`;

            if (simulateDelay) {
                console.log("DB Query: Update Node 1 (Simulating 5s Delay)");
                let res = await transactionUtils.doDelayTransaction(1, setupSql + fullSql, 10000);
                syncUtils.syncFragment(2)
                syncUtils.syncFragment(3)
                return res
            } else {
                console.log(`DB Query: Update Node 1 (${isolationLevel})`);
                let res = await transactionUtils.doMultiTransaction(node, `START TRANSACTION; ${setupSql} ${fullSql} COMMIT;`);
               
                await syncUtils.syncFragment(2); 
                await syncUtils.syncFragment(3);
                
                return res;
            }

        // NODE 2
        } else if ((year <= 2010 || year == null) && await nodeUtils.pingNode(2)){
            let updateQuery = baseQuery + "node_2" + tableQuery;
            
            if (simulateDelay) {
                console.log("DB Query: Update Node 2 (Simulating 5s Delay)");
                let res = await transactionUtils.doDelayTransaction(2, updateQuery, 10000);
                syncUtils.syncMaster()
                return res
            } else {
                console.log(`DB Query: Update Node 2 (${isolationLevel})`);
                let res = await transactionUtils.doTransactionWithIsolation(2, updateQuery, isolationLevel);
                await syncUtils.syncMaster();     // 1. Push to Master
                await syncUtils.syncFragment(2);
                return res
            }

        // NODE 3
        } else if (year > 2010 && await nodeUtils.pingNode(3)){
            let updateQuery = baseQuery + "node_3" + tableQuery;
            if (simulateDelay) {
                console.log("DB Query: Update Node 3 (Simulating 5s Delay)");
                let res = await transactionUtils.doDelayTransaction(3, updateQuery, 10000);
                syncUtils.syncMaster()
                return res
            } else {
                console.log(`DB Query: Update Node 3 (${isolationLevel})`);
                let res = await transactionUtils.doTransactionWithIsolation(3, updateQuery, isolationLevel);
                await syncUtils.syncMaster();
                await syncUtils.syncFragment(3);
                return res
            }
        } else {
            console.log("DB Query: No nodes are available.")
        }
    },
    deleteQuery: async function (query, year, node){
        let baseQuery = "DELETE FROM "
        let tableQuery = " WHERE tconst = '" + query + "';"
        
        if (node == 1 && await nodeUtils.pingNode(1)){
            const { node2Alive, node3Alive } = await nodeUtils.pingAllNodes();
            const node2StatusFlag = node2Alive ? 1 : 0;
            const node3StatusFlag = node3Alive ? 1 : 0;
            let deleteQuery = `
                SET @NODE_2_ALIVE = ${node2StatusFlag};
                SET @NODE_3_ALIVE = ${node3StatusFlag};
                SET @REPLICATOR_SYNC = 0;
                START TRANSACTION;
                ${baseQuery} node_1 ${tableQuery}
                COMMIT;
            `
            let result = await transactionUtils.doMultiTransaction(node, deleteQuery)
            console.log("DB Query: Delete from Node 1")
            syncUtils.syncFragment(2)
            syncUtils.syncFragment(3)
            return result
        } else if ((year <= 2010 || year == null) && await nodeUtils.pingNode(2)){
            let deleteQuery = baseQuery + "node_2" + tableQuery
            console.log("DB Query: Delete from Node 2")
            let result = await transactionUtils.doTransaction(2, deleteQuery)
            syncUtils.syncMaster()
            return result
        } else if (year > 2010 && await nodeUtils.pingNode(3)){
            let deleteQuery = baseQuery + "node_3" + tableQuery
            console.log("DB Query: Delete from Node 3")
            let result = await transactionUtils.doTransaction(3, deleteQuery)
            syncUtils.syncMaster()
            console.log('Should be here')
            return result
        } else{
            console.log("DB Query: No nodes are available at this moment. Please try again later.")
        }
    }
}

module.exports = dbQueries