const {node1, node2, node3, nodeUtils} = require('./nodes.js'); 
const transactionUtils = require('./transactions.js'); 

const syncUtils = {
    syncFragment: async function (nodeNum){
        console.log(`[Sync] Synchronizing Node ${nodeNum}...`)
        
        try {
            // We use @REPLICATOR_SYNC = 1 to prevent this DELETE from being logged/replicated back to Master
            if (nodeNum == 2) {
                // Node 2 only wants <= 2010. Delete anything > 2010.
                await transactionUtils.doTransaction(2, 
                    "SET @REPLICATOR_SYNC = 1; DELETE FROM node_2 WHERE startYear > 2010;"
                );
            } else if (nodeNum == 3) {
                // Node 3 only wants > 2010. Delete anything <= 2010 OR NULL.
                await transactionUtils.doTransaction(3, 
                    "SET @REPLICATOR_SYNC = 1; DELETE FROM node_3 WHERE startYear <= 2010 OR startYear IS NULL;"
                );
            }
        } catch (e) {
            console.log(`[Sync Warning] Cleanup failed on Node ${nodeNum}: ${e.message}`);
        }

        if (await nodeUtils.pingNode(1) && await nodeUtils.pingNode(nodeNum)){
            let logs = []
            var baseQuery = (`SELECT MAX(log_id) AS idMax FROM log_table`)

            // 1. Get Log Pointers
            var maxMaster = await transactionUtils.doTransaction(1, baseQuery + '_' + nodeNum)
            var maxFrag = await transactionUtils.doTransaction(nodeNum, baseQuery)

            maxMaster = maxMaster[0].idMax ?? 0
            maxFrag = maxFrag[0]?.idMax ?? 0
            
            // 2. If Master has new logs for this node
            if (maxMaster > maxFrag){
                var masterQuery = (`SELECT * FROM log_table_` + nodeNum + ` WHERE log_id > ` + maxFrag)
                logs = await transactionUtils.doTransaction(1, masterQuery)

                let bulkQueries = " "
                bulkQueries += "START TRANSACTION; "
                
                for (i = 0; i < logs.length; i++){
                    const log = logs[i]
                    
                    // --- MIGRATION LOGIC ---
                    // Determine if this movie belongs in the current node
                    let belongsInNode = false;
                    
                    // Node 2 Criteria: <= 2010 or NULL
                    if (nodeNum == 2 && (log.startYear <= 2010 || log.startYear == null)) {
                        belongsInNode = true;
                    }
                    // Node 3 Criteria: > 2010
                    else if (nodeNum == 3 && log.startYear > 2010) {
                        belongsInNode = true;
                    }

                    // CASE A: It's a DELETE action -> Always delete
                    if (log.action == "DELETE"){
                        const query = `DELETE FROM node_` + nodeNum +  ` WHERE tconst = '${log.tconst}';` 
                        bulkQueries += query
                    } 
                    // CASE B: It's INSERT/UPDATE but data NO LONGER BELONGS here -> DELETE IT
                    else if (!belongsInNode) {
                        // This handles the "Move" (Migration)
                        console.log(`   -> Migrating ${log.tconst} (Year ${log.startYear}) OUT of Node ${nodeNum}`);
                        const query = `DELETE FROM node_` + nodeNum +  ` WHERE tconst = '${log.tconst}';` 
                        bulkQueries += query
                    }
                    // CASE C: It belongs here -> EXECUTE NORMAL INSERT/UPDATE
                    else {
                        const query = `REPLACE INTO node_${nodeNum} (tconst, titleType, primaryTitle, originalTitle, isAdult, startYear, endYear, runtimeMinutes, genres) VALUES (
                            '${log.tconst}', '${log.titleType}', '${log.primaryTitle}', '${log.originalTitle}',
                            ${log.isAdult}, ${log.startYear}, ${log.endYear}, ${log.runtimeMinutes}, '${log.genres}'
                        );`
                        bulkQueries += query
                    }
                }
                bulkQueries += "COMMIT;"
                
                if (logs.length > 0) {
                    console.log("Query: "+ bulkQueries)
                    let results = await transactionUtils.doMultiTransaction(nodeNum, bulkQueries);
                    return results
                } else {
                    return { message: "No queries generated" };
                }
            }
        }
    },
    syncMaster: async function (){
        console.log("Sync: Master Node")
        if (await nodeUtils.pingNode(1) && await nodeUtils.pingNode(2) && await nodeUtils.pingNode(3)){
            let node2Logs = []
            let node3Logs = []
            let combinedLogs = []

            var baseQuery = (`SELECT MAX(log_id) AS idMax FROM log_table`)
            var maxMaster2 = await transactionUtils.doTransaction(1, baseQuery + "_2")
            var maxMaster3 = await transactionUtils.doTransaction(1, baseQuery + "_3")
            var maxFrag2 = await transactionUtils.doTransaction(2, baseQuery)
            var maxFrag3 = await transactionUtils.doTransaction(3, baseQuery)
            
            maxMaster2 = maxMaster2[0]?.idMax ?? 0
            maxMaster3 = maxMaster3[0]?.idMax ?? 0
            maxFrag2 = maxFrag2[0]?.idMax ?? 0
            maxFrag3 = maxFrag3[0]?.idMax ?? 0

            if (maxMaster2 < maxFrag2){
                var node2Query =  (`SELECT * FROM log_table WHERE log_id > ` + maxMaster2)
                node2Logs = await transactionUtils.doTransaction(2, node2Query)
            } else if (maxMaster2 > maxFrag2){
                console.log("Alert: Node 2 needs to be synced")
            }

            if (maxMaster3 < maxFrag3){
                var node3Query = (`SELECT * FROM log_table WHERE log_id > ` + maxMaster3)
                node3Logs = await transactionUtils.doTransaction(3, node3Query)
            } else if (maxMaster3 > maxFrag3){
                console.log("Alert: Node 3 needs to be synced")
            }

            combinedLogs = node2Logs.concat(node3Logs)
            combinedLogs.sort((a, b) => b.action_time - a.action_time)

            if (combinedLogs.length === 0) return { message: "Master is already up to date" };

            let bulkQueries = " "
            bulkQueries += "SET @REPLICATOR_SYNC = 1; "
            bulkQueries += "START TRANSACTION; "
            
            for (i = 0; i < combinedLogs.length; i++){
                const log = combinedLogs[i]
                if (log.action == "INSERT" || log.action == "UPDATE"){
                    bulkQueries += `REPLACE INTO node_1 (tconst, titleType, primaryTitle, originalTitle, isAdult, startYear, endYear, runtimeMinutes, genres) VALUES (
                        '${log.tconst}', '${log.titleType}', '${log.primaryTitle}', '${log.originalTitle}',
                        ${log.isAdult}, ${log.startYear}, ${log.endYear}, ${log.runtimeMinutes}, '${log.genres}'
                    ); `
                } else if (log.action == "DELETE"){
                    const query = `DELETE FROM node_1 WHERE tconst = '${log.tconst}';` // Fixed quotes around tconst
                    bulkQueries += query
                }
            }
            bulkQueries += "COMMIT;"
            console.log("Query: "+ bulkQueries)
            let results = await transactionUtils.doMultiTransaction(1, bulkQueries);
            return results
        } else{
            console.log("Sync Node: Master Node is down")
        }
    }
}

module.exports = syncUtils