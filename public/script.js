// Reference: https://developer.mozilla.org/en-US/docs/Web/API/Document/getElementById
const getValue = (id) => document.getElementById(id).value;

document.addEventListener('DOMContentLoaded', () => {
    fetchDatabaseData();
});



// Replace your existing fetchDatabaseData function with this fixed version
async function fetchDatabaseData() {
    const tableBody = document.getElementById('database-body');
    if(!tableBody) return;

    try {
        const response = await fetch('/api/database');
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();
        tableBody.innerHTML = '';

        // Handle if data is wrapped in a 'result' object or is an array
        const rows = Array.isArray(data) ? data : (data.result || []);

        if (rows.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No records found or Database Disconnected</td></tr>';
            return;
        }

        rows.forEach(row => {
            const tr = document.createElement('tr');
            // Fixed the missing </td> on the first line below
            tr.innerHTML = `
            <td>${row.tconst}</td> 
            <td>${row.titleType}</td>
            <td>${row.primaryTitle}</td>
            <td>${row.originalTitle}</td>
            <td>${row.isAdult}</td>
            <td>${row.startYear}</td>
            <td>${row.runtimeMinutes}</td>
            <td>${row.genres}</td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error fetching database data:', error.message);
        tableBody.innerHTML = `<tr><td colspan="8" style="color:red; text-align:center;">Error: ${error.message}</td></tr>`;
    }
}
//References: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
async function handleInsert(){
    const data = {
       tconst: getValue('id'),
       titleType: getValue('titleType'),
       primaryTitle: getValue('PrimaryName'), 
       originalTitle: getValue('OriginalName'), 
       isAdult: getValue('Adult'), 
       startYear: getValue('StartYear'), 
       endYear: getValue('EndYear'), 
       runtimeMinutes: getValue('RunTime'),
       genres: getValue('genre'), 
    };
    
    try {
        /*Sample Syntax: const response = await fetch("https://example.org/post", {
        method: "POST",
        headers: {
         "Content-Type": "application/json",
         }, 
         body: JSON.stringify({ username: "example" }),
         */
        const response = await fetch('/api/insert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const result = await response.json();
        console.log(result);
        alert("Insert: " + result.message);
    } catch (error) {
        console.error(error.message);
    }
}

async function handleUpdate(){
    const data = {
       tconst: getValue('update_id'),
       titleType: getValue('update_titleType'),
       primaryTitle: getValue('update_PrimaryName'), 
       originalTitle: getValue('update_OriginalName'), 
       isAdult: getValue('update_Adult'), 
       startYear: getValue('update_StartYear'), 
       endYear: getValue('update_EndYear'), 
       runtimeMinutes: getValue('update_RunTime'),
       genres: getValue('update_Genre'), 
    };

    try {
        const response = await fetch('/api/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const result = await response.json();
        console.log(result);
        alert("Update: " + result.message + data);
    } catch (error) {
        console.error(error.message);
    }
} 

async function handleDelete(){
    const data = {
        id: getValue('delete_id'), 
        year: getValue('delete_year')
    };

    try {
        const response = await fetch('/api/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const result = await response.json();
        console.log(result);
        alert("Delete: " + result.message);
    } catch (error) {
        console.error(error.message);
    }
}

    async function handleRead(){
        const data = {
            id: getValue('read_id'),
            year: getValue('read_year')
        };

        try {
            const response = await fetch('/api/read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            console.log(result);
            alert("Read: " + JSON.stringify(result.data));
        } catch (error) {
        console.error(error.message);
    }
}

async function checkNodeStatus(node){   
    const element = document.getElementById(`node-${node}`);
    try {
        const response = await fetch(`/api/pingNode/${node}`);
        const result = await response.json();
        if (result.alive) {
            element.textContent = `Reachable`;
            element.style.color = 'green';
        } else {
            element.textContent = `Not Reachable`;
            element.style.color = 'red';
        }
    } catch (error) {
        console.error(`Error checking status of Node ${node}:`, error);
        element.textContent = `Error checking Node ${node}`;
        element.style.color = 'orange';
    }
}