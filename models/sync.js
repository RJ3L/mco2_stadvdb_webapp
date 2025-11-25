const {node1, node2, node3, nodeUtils} = require('./nodes.js'); 
const transactionUtils = require('./transactions.js'); 

const syncUtils = {
    syncFragment: async function (fragNode, nodeNum){
        console.log("Sync Fragments: Node ")
        if (await nodeUtils.pingNode(1)){
            
        }
    }
}