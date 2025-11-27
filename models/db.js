const {node1, node2, node3, nodeUtils} = require('./nodes.js'); 
const transactionUtils = require('./transactions.js'); 

const dbQueries = {
    selectQuery: async function (query, limit, fromYear, toYear, node){
        // Query from Node 1 Directly
        if (node == 1 && await nodeUtils.pingNode(1)){
            console.log("DB Query: Select from Node 1")
            const [movies, fields] = await node1
                .query(`SELECT * FROM node_1 ` +  query + ` ORDER BY startYear ` + limit)
            return movies
        } else{
            // If toYear <= 2010, query from node 2
            if (toYear <= 2010 || toYear == NULL){
                // Check if available first
                if (await nodeUtils.pingNode(2)){
                    console.log("DB Query: Select from Node 2")
                    const [movies, fields] = await node2
                        .query(`SELECT * FROM node_2 ` +  query + ` ORDER BY startYear ` + limit)
                    return movies
                } else if (await nodeUtils.pingNode(1)){
                    console.log("DB Query: Select from Node 1")
                    const [movies, fields] = await node1
                        .query(`SELECT * FROM node_1 ` +  query + ` ORDER BY startYear ` + limit)
                    return movies
                } else{
                    console.log("DB Query: No nodes are available at this moment. Please try again later.")
                }
            } else if (fromYear > 2010){
                // Query from Node 3 if fromYear > 2010
                if (await nodeUtils.pingNode(3)){
                    console.log("DB Query: Select from Node 3")
                    const [movies, fields] = await node3
                        .query(`SELECT * FROM node_3 ` +  query + ` ORDER BY startYear ` + limit)
                    return movies
                } else if (await nodeUtils.pingNode(1)){
                    console.log("DB Query: Select from Node 1")
                    const [movies, fields] = await node1
                        .query(`SELECT * FROM node_1 ` +  query + ` ORDER BY startYear ` + limit)
                    return movies
                } else{
                    console.log("DB Query: No nodes are available at this moment. Please try again later.")
                }
            } else {
                // Range spans both nodes
                if (await nodeUtils.pingNode(1)){
                    console.log("DB Query: Select from Node 1")
                    const [movies, fields] = await node1
                        .query(`SELECT * FROM node_1 ` +  query + ` ORDER BY startYear ` + limit)
                    return movies
                } else {
                    // If Node 1 is down, query from both Nodes 2 and 3 
                    if (await nodeUtils.pingNode(2) && await nodeUtils.pingNode(3)){
                        console.log("DB Query: Select from both Nodes 2 and 3")
                        const [movies2, fields2] = await node2
                            .query(`SELECT * FROM node_2 ` +  query + ` ORDER BY startYear`)
                        const [movies3, fields3] = await node3
                            .query(`SELECT * FROM node_3 ` +  query + ` ORDER BY startYear`)
                        return movies2.concat(movies3)
                    } else{
                        // All nodes are down
                        console.log("DB Query: No nodes are available at this moment. Please try again later.")
                    }
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
    updateQuery: async function (valuesQuery, tconst, year, node){
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
        
        if (node ==1 && await nodeUtils.pingNode(1)){
            const { node2Alive, node3Alive } = await nodeUtils.pingAllNodes();
            const node2StatusFlag = node2Alive ? 1 : 0;
            const node3StatusFlag = node3Alive ? 1 : 0;
            let updateQuery = `
                SET @NODE_2_ALIVE = ${node2StatusFlag};
                SET @NODE_3_ALIVE = ${node3StatusFlag};
                SET @REPLICATOR_SYNC = 0;
                START TRANSACTION;
                ${baseQuery} node_1 ${tableQuery}
                COMMIT;
            `
            let result = await transactionUtils.doMultiTransaction(node, updateQuery)
            console.log("DB Query: Update to Node 1")
            return result
        } else if ((year <= 2010 || year == null) && await nodeUtils.pingNode(2)){
            let updateQuery = baseQuery + "node_2" + tableQuery
            console.log("DB Query: Update to Node 2")
            let result = await transactionUtils.doTransaction(2, updateQuery)
            return result
        } else if (year > 2010 && await nodeUtils.pingNode(3)){
            let updateQuery = baseQuery + "node_3" + tableQuery
            console.log("DB Query: Update to Node 3")
            let result = await transactionUtils.doTransaction(3, updateQuery)
            return result
        } else{
            console.log("DB Query: No nodes are available at this moment. Please try again later.")
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