const {node1, node2, node3, nodeUtils} = require('./nodes.js'); 
const transactionUtils = require('./transactions.js'); 

const syncUtils = {
    syncFragment: async function (fragNode, nodeNum){
        console.log("Sync: Fragments")
        if (await nodeUtils.pingNode(1)){
            
        }
    },
    syncMaster: async function (){
        console.log("Sync: Master Node")

        if (await nodeUtils.pingNode(1) && await nodeUtils.pingNode(2) && await nodeUtils.pingNode(3)){
            let node2Logs = []
            let node3Logs = []
            let combinedLogs = []

            var baseQuery = (`SELECT MAX(log_id) AS idMax FROM log_table`); 
            var maxMaster2 = await transactionUtils.doTransaction(1, baseQuery + " WHERE startYear <= 2010 OR startYear IS NULL")
            var maxMaster3 = await transactionUtils.doTransaction(1, baseQuery + " WHERE startYear > 2010")
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
                node3Logs = await transactionUtils.doTransaction(3, node2Query)
            } else if (maxMaster3 > maxFrag3){
                console.log("Alert: Node 3 needs to be synced")
            }

            combinedLogs = node2Logs.concat(node3Logs)
            combinedLogs.sort((a, b) => b.action_time - a.action_time)

            let bulkQueries = " "
            bulkQueries += "SET @REPLICATOR_SYNC = 1; "
            bulkQueries += "START TRANSACTION; "
            
            for (let i = 0; i < combinedLogs.length; i++){
                if (combinedLogs[i].action == "INSERT"){
                    const query = `REPLACE INTO node_1 (tconst, titleType, primaryTitle, originalTitle, isAdult, startYear, endYear, runtimeMinutes, genres) VALUES (
                        '${combinedLogs[i].tconst}', 
                        '${combinedLogs[i].titleType}', 
                        '${combinedLogs[i].primaryTitle}', 
                        '${combinedLogs[i].originalTitle}',
                        ${combinedLogs[i].isAdult},   
                        ${combinedLogs[i].startYear}, 
                        ${combinedLogs[i].endYear}, 
                        ${combinedLogs[i].runtimeMinutes}, 
                        '${combinedLogs[i].genres}'
                    );`
                    bulkQueries += query
                } else if (combinedLogs[i].action == "UPDATE"){
                    const query = `UPDATE node_1 SET 
                        tconst = ` + combinedLogs[i].tconst + `
                        titleType = ` + combinedLogs[i].titleType + `
                        primaryTitle = ` + combinedLogs[i].primaryTitle + `
                        originalTitle = ` + combinedLogs[i].originalTitle + `
                        isAdult = ` + combinedLogs[i].isAdult + `
                        startYear = ` + combinedLogs[i].startYear + `
                        endYear = ` + combinedLogs[i].endYear + `
                        runtimeMinutes = ` + combinedLogs[i].runtimeMinutes + `
                        genres = ` + combinedLogs[i].genres
                    bulkQueries += query
                } else if (combinedLogs[i].action == "DELETE"){
                    const query = `DELETE FROM node_1 WHERE tconst = ` + combinedLogs[i].tconst
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