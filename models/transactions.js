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
    doDelayTransaction: async function (node, query){
        let connection
        try{
            connection = await nodeUtils.getConnection(node)
            await connection.beginTransaction()
            var [result, fields] = await connection.query(query)
            await sleep(5000)
            await connection.commit()
            console.log("Transaction Completed")
            return result
        } catch(error){
            if (connection){
                await connection.rollback
            }
            throw error
        } finally{
            if (connection){
                await connection.release()
            }
        }
    }
}

module.exports = transactionUtils