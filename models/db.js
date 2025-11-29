const {node1, node2, node3, nodeUtils} = require('./nodes.js'); 
const transactionUtils = require('./transactions.js'); 
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const dbQueries = {
    
    // UPDATED: Added isolationLevel parameter
    selectQuery: async function (query, limit, fromYear, toYear, node, requestNode, isolationLevel){
        
        // Helper to run the select via transactionUtils
        const runSelect = async (targetNode, sql) => {
            return await transactionUtils.executeSelect(targetNode, sql, isolationLevel);
        };

        // Standard SQL Construction
        // We use your existing logic logic to route to 1, 2, or 3
        
        if (node == 1 && await nodeUtils.pingNode(1)){
            console.log("DB Query: Select from Node 1");
            return await runSelect(1, `SELECT * FROM node_1 ` + query + ` ` + limit);
        } else {
            // Logic to choose node based on year
            if (toYear <= 2010 || toYear == null){
                if (await nodeUtils.pingNode(2)){
                    console.log("DB Query: Select from Node 2");
                    return await runSelect(2, `SELECT * FROM node_2 ` + query + ` ` + limit);
                } else if (await nodeUtils.pingNode(1)){
                    console.log("DB Query: Select from Node 1");
                    return await runSelect(1, `SELECT * FROM node_1 ` + query + ` ` + limit);
                }
            } else if (fromYear > 2010){
                if (await nodeUtils.pingNode(3)){
                    console.log("DB Query: Select from Node 3");
                    return await runSelect(3, `SELECT * FROM node_3 ` + query + ` ` + limit);
                } else if (await nodeUtils.pingNode(1)){
                    console.log("DB Query: Select from Node 1");
                    return await runSelect(1, `SELECT * FROM node_1 ` + query + ` ` + limit);
                }
            }
            
            // Fallback for complex ranges (Simplified for demo stability)
            if (await nodeUtils.pingNode(1)){
                 return await runSelect(1, `SELECT * FROM node_1 ` + query + ` ` + limit);
            }
            
             console.log("DB Query: No suitable node found or range logic complex.");
             return [];
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
    updateQuery: async function (valuesQuery, tconst, year, node, isolationLevel, isDemoMode){
        const headersArray = valuesQuery.split(',').map(item => item.trim());
        let genres = headersArray.slice(7).join(',');
        
        // Base Update String
        let updateClause = " SET " + 
            "titleType = '" + headersArray[0] + "', " + 
            "primaryTitle = '" + headersArray[1] + "', " + 
            "originalTitle = '" + headersArray[2] + "', " + 
            "isAdult = '" + headersArray[3] + "', " + 
            "startYear = '" + headersArray[4] + "', " + 
            "endYear = '" + headersArray[5] + "', " + 
            "runtimeMinutes = '" + headersArray[6] + "', " + 
            "genres = '" + genres + "' " + 
            "WHERE tconst = '" + tconst + "';";
        
        // Logic for Node 1 (Master)
        if (node == 1 && await nodeUtils.pingNode(1)){
            const { node2Alive, node3Alive } = await nodeUtils.pingAllNodes();
            
            // IMPORTANT: Inject SQL Sleep for Node 1 Multi-Statement
            let sleepCommand = isDemoMode ? "DO SLEEP(10);" : ""; 

            let updateQuery = `
                SET @NODE_2_ALIVE = ${node2Alive ? 1 : 0};
                SET @NODE_3_ALIVE = ${node3Alive ? 1 : 0};
                SET @REPLICATOR_SYNC = 0;
                SET SESSION TRANSACTION ISOLATION LEVEL ${isolationLevel || 'REPEATABLE READ'};
                START TRANSACTION;
                UPDATE node_1 ${updateClause}
                ${sleepCommand} 
                COMMIT;
            `
            // We use doMultiTransaction here
            let result = await transactionUtils.doMultiTransaction(1, updateQuery)
            console.log("DB Query: Update to Node 1 (Multi)")
            return result

        } else if ((year <= 2010 || year == null) && await nodeUtils.pingNode(2)){
            // Logic for Node 2
            let sql = "UPDATE node_2" + updateClause
            console.log("DB Query: Update to Node 2")
            // Use the new executeUpdate to handle the sleep in JS
            return await transactionUtils.executeUpdate(2, sql, isolationLevel, isDemoMode);

        } else if (year > 2010 && await nodeUtils.pingNode(3)){
            // Logic for Node 3
            let sql = "UPDATE node_3" + updateClause
            console.log("DB Query: Update to Node 3")
            return await transactionUtils.executeUpdate(3, sql, isolationLevel, isDemoMode);

        } else{
            console.log("DB Query: No nodes are available at this moment.")
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
            return result
        } else if ((year <= 2010 || year == null) && await nodeUtils.pingNode(2)){
            let deleteQuery = baseQuery + "node_2" + tableQuery
            console.log("DB Query: Delete from Node 2")
            let result = await transactionUtils.doTransaction(2, deleteQuery)
            return result
        } else if (year > 2010 && await nodeUtils.pingNode(3)){
            let deleteQuery = baseQuery + "node_3" + tableQuery
            console.log("DB Query: Delete from Node 3")
            let result = await transactionUtils.doTransaction(3, deleteQuery)
            return result
        } else{
            console.log("DB Query: No nodes are available at this moment. Please try again later.")
        }
    }
}

module.exports = dbQueries