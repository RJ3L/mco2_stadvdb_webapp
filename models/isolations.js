const transactionUtils = require('./transactions.js');
const { nodeUtils } = require('./nodes.js');

const TEST_TYPE = process.argv[2]; // 1=Read Uncommitted, etc.
const NODE_ARG = process.argv[3];  // 1, 2, or 3
const ID_ARG   = process.argv[4];  // Movie ID (tconst)

// Defaults if you don't type them
const NODE = NODE_ARG ? parseInt(NODE_ARG) : 1; 
const TARGET_ID = ID_ARG || 'tt0000001'; 

const CLEAN_TITLE = "Original_Movie_Title";
const DIRTY_TITLE = "DIRTY_UNCOMMITTED_DATA";
const NEW_TITLE = "OFFICIALLY_UPDATED_TITLE";

console.log(`\n--- CONFIGURATION ---`);
console.log(`TARGET NODE: ${NODE}`);
console.log(`TARGET ID:   ${TARGET_ID}`);
console.log(`---------------------\n`);

// Helper to reset data before every test so results are clean
async function resetData() {
    console.log("--- Resetting Data ---");
    const table = `node_${NODE}`; // Dynamic table name based on node
    await transactionUtils.doTransactionWithIsolation(NODE, 
        `UPDATE ${table} SET primaryTitle = '${CLEAN_TITLE}' WHERE tconst = '${TARGET_ID}'`, 
        'READ COMMITTED'
    );
}

// ==========================================
// LEVEL 1: READ UNCOMMITTED (The "Dirty Read")
// ==========================================
async function demoReadUncommitted() {
    console.log("\n=== DEMO: READ UNCOMMITTED ===");
    const table = `node_${NODE}`;

    // 1. Start Slow Writer 
    const writePromise = transactionUtils.doDelayTransaction(NODE, 
        `UPDATE ${table} SET primaryTitle = '${DIRTY_TITLE}' WHERE tconst = '${TARGET_ID}'`, 
        3000
    );

    await new Promise(r => setTimeout(r, 1000));

    // 2. Reader checks 
    const conn = await nodeUtils.getConnection(NODE);
    try {
        await conn.query("SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED");
        await conn.beginTransaction();
        
        const [rows] = await conn.query(`SELECT primaryTitle FROM ${table} WHERE tconst = '${TARGET_ID}'`);
        console.log(`   [Reader] I see: "${rows[0]?.primaryTitle}"`); 
        
        if (rows[0]?.primaryTitle === DIRTY_TITLE) {
            console.log("   SUCCESS: Dirty Read demonstrated!");
        } else {
            console.log("   FAIL: Could not see dirty data.");
        }
        await conn.commit();
    } finally {
        conn.release();
    }
    
    await writePromise;
}

// ==========================================
// LEVEL 2: READ COMMITTED (No Dirty Read)
// ==========================================
async function demoReadCommitted() {
    console.log("\n=== DEMO: READ COMMITTED ===");
    console.log("Expected: Reader sees OLD data while Writer is working.");
    const table = `node_${NODE}`;

    // 1. Start Slow Writer
    const writeTask = transactionUtils.doDelayTransaction(NODE, 
        `UPDATE ${table} SET primaryTitle = '${NEW_TITLE}' WHERE tconst = '${TARGET_ID}'`, 
        3000
    );

    // 2. Wait 1s (Writer is mid-transaction)
    await new Promise(r => setTimeout(r, 1000));

    const conn = await nodeUtils.getConnection(NODE);
    try {
        await conn.query("SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED");
        await conn.beginTransaction();

        // 3. First Read (Should be clean)
        let [rows] = await conn.query(`SELECT primaryTitle FROM ${table} WHERE tconst = '${TARGET_ID}'`);
        console.log(`   [Reader] First Peek (During Write): "${rows[0].primaryTitle}"`);
        
        if (rows[0].primaryTitle === CLEAN_TITLE) {
            console.log("   Good: I cannot see the uncommitted data.");
        } else {
            console.log("   Fail: I saw data I shouldn't have.");
        }

        await conn.commit();
    } finally {
        conn.release();
    }

    // 4. Wait for Writer to finish
    await writeTask;

    // 5. Verify it actually updated later
    const [rows2] = await transactionUtils.doTransactionWithIsolation(NODE, `SELECT primaryTitle FROM ${table} WHERE tconst = '${TARGET_ID}'`, 'READ COMMITTED');
    console.log(`   [Reader] Second Peek (After Commit): "${rows2[0].primaryTitle}"`);
}

// ==========================================
// LEVEL 3: REPEATABLE READ (Snapshot)
// ==========================================
async function demoRepeatableRead() {
    console.log("\n=== DEMO: REPEATABLE READ ===");
    console.log("Expected: Reader sees OLD data even after Writer completely finishes.");
    const table = `node_${NODE}`;

    const conn = await nodeUtils.getConnection(NODE);
    try {
        await conn.query("SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ");
        await conn.beginTransaction();

        // 1. Initial Read (Establishes the Snapshot)
        let [rows] = await conn.query(`SELECT primaryTitle FROM ${table} WHERE tconst = '${TARGET_ID}'`);
        console.log(`   [Reader] Start Transaction. Value is: "${rows[0].primaryTitle}"`);

        // 2. Writer updates and COMMITS while Reader is still open
        console.log("   --- External Writer Updates DB now ---");
        // We use a normal transaction here because we want it to finish quickly
        await transactionUtils.doTransactionWithIsolation(NODE, 
            `UPDATE ${table} SET primaryTitle = '${NEW_TITLE}' WHERE tconst = '${TARGET_ID}'`, 
            'READ COMMITTED'
        );
        console.log("   --- External Writer Finished ---");

        // 3. Reader reads again
        let [rows2] = await conn.query(`SELECT primaryTitle FROM ${table} WHERE tconst = '${TARGET_ID}'`);
        console.log(`   [Reader] Checking again... Value is: "${rows2[0].primaryTitle}"`);

        if (rows2[0].primaryTitle === CLEAN_TITLE) {
            console.log("   SUCCESS: Snapshot maintained! (I don't see the new change)");
        } else {
            console.log("   FAIL: I saw the new change.");
        }

        await conn.commit();
    } finally {
        conn.release();
    }
}

// ==========================================
// LEVEL 4: SERIALIZABLE (Locking)
// ==========================================
async function demoSerializable() {
    console.log("\n=== DEMO: SERIALIZABLE ===");
    console.log("Expected: Writer is BLOCKED until Reader finishes.");
    const table = `node_${NODE}`;

    // 1. Start a slow Reader (Holds lock for 3s)
    // We use the new doSlowRead function
    const readerPromise = transactionUtils.doSlowRead(NODE, 
        `SELECT * FROM ${table} WHERE tconst = '${TARGET_ID}'`, 
        'SERIALIZABLE', 
        3000 // Sleep 3s
    );

    // Ensure reader has established lock
    await new Promise(r => setTimeout(r, 1000)); 

    // 2. Try to Write
    console.log("   [Writer] Trying to update... (Should pause)");
    const start = Date.now();
    
    // This should hang until reader finishes
    await transactionUtils.doTransactionWithIsolation(NODE, 
        `UPDATE ${table} SET primaryTitle = '${NEW_TITLE}' WHERE tconst = '${TARGET_ID}'`, 
        'READ COMMITTED'
    );
    
    const duration = Date.now() - start;
    console.log(`   [Writer] Update success! Took ${duration}ms`);

    if (duration > 2000) {
        console.log("   SUCCESS: Writer was forced to wait.");
    } else {
        console.log("   FAIL: Writer happened instantly (No locking).");
    }
    
    await readerPromise;
}

(async () => {
    if (!TEST_TYPE) {
        console.log("Please provide arguments: node isolations.js <TEST_NUM> <NODE_ID>");
        console.log("Example: node isolations.js 1 2  (Run Dirty Read Test on Node 2)");
        process.exit();
    }

    try {
        await resetData();

        switch(TEST_TYPE) {
            case '1': await demoReadUncommitted(); break;
            case '2': await demoReadCommitted(); break;
            case '3': await demoRepeatableRead(); break;
            case '4': await demoSerializable(); break;
            default: console.log("Unknown Test Type");
        }
    } catch (e) {
        console.error("Test Error:", e.message);
    }
    process.exit();
})();