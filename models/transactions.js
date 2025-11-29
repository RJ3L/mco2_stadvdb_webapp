const {node1, node2, node3, nodeUtils} = require('./nodes.js'); 

function sleep(milliseconds){
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

const transactionUtils = {
    doTransaction: async function (node, query){
        let connection
        try{
            connection = await nodeUtils.getConnection(node)
            await connection.beginTransaction()

            var [result, fields] = await connection.query(query)
            await connection.commit()
            console.log("Transaction Completed")
            return result
        } catch(error){
            if (connection){
                await connection.rollback()
            }
            throw error
        } finally {
            if (connection){
                await connection.release()
            }
        }
    },
    doMultiTransaction: async function (node, query){
        let connection
        try{
            connection = await nodeUtils.getConnection(node)
            var [result, fields] = await connection.query({
                sql: query,
                multipleStatements: true
            })
            console.log("Transaction Completed")
            return result
        } catch(error){
            console.log("Transaction Failed")
            if (connection){
                await connection.rollback()
            }
        } finally{
            if (connection){
                await connection.release()
            }
        }
    },
    doTransactionWithIsolation: async function (node, query, isolationLevel = 'REPEATABLE READ') {
        let connection
        try {
            connection = await nodeUtils.getConnection(node)
            
            // 1. Set the isolation level for this specific session
            await connection.query(`SET SESSION TRANSACTION ISOLATION LEVEL ${isolationLevel}`)
            
            // 2. Begin
            await connection.beginTransaction()

            // 3. Execute
            var [result, fields] = await connection.query(query)
            
            // 4. Commit
            await connection.commit()
            return result
        } catch (error) {
            if (connection) await connection.rollback()
            throw error
        } finally {
            if (connection) await connection.release()
        }
    },

    doSlowRead: async function (node, query, isolationLevel, delay = 10000){
        let connection
        try{
            connection = await nodeUtils.getConnection(node)
            // Set Isolation Level
            await connection.query(`SET SESSION TRANSACTION ISOLATION LEVEL ${isolationLevel}`)
            await connection.beginTransaction()
            
            console.log(`   [Reader] Reading data (holding shared lock)...`)
            const [rows] = await connection.query(query)
            console.log(`   [Reader] Read Success. Sleeping for ${delay}ms...`)

            // Sleep while holding the READ lock
            await sleep(delay)
            
            await connection.commit()
            console.log("   [Reader] Transaction Finished.")
            return rows
        } catch(error){
            if (connection) await connection.rollback()
            throw error
        } finally{
            if (connection) await connection.release()
        }
    },

    doDelayTransaction: async function (node, query, delay = 10000) {
        let connection
        try {
            connection = await nodeUtils.getConnection(node)
            
            // 1. Start the Transaction
            await connection.beginTransaction()

            console.log("   [Writer] Transaction Started. Updating data...")
            
            // 2. Execute the Query (e.g., UPDATE movie SET title = 'Dirty Data')
            var [result, fields] = await connection.query(query)
            
            // 3. Sleep to simulate a long process
            // This holds the "Uncommitted" state so you can test it from another node
            console.log(`   [Writer] Sleeping for ${delay}ms (holding lock)...`)
            await sleep(delay) 
            
            // 4. Commit (Save changes)
            await connection.commit()
            console.log("   [Writer] Committed successfully.")
            return result

        } catch (error) {
            console.log("   [Writer] Error! Rolling back.")
            if (connection) {
                await connection.rollback()
            }
            throw error
        } finally {
            if (connection) {
                await connection.release()
            }
        }
    },
}

module.exports = transactionUtils