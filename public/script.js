// Reference: https://developer.mozilla.org/en-US/docs/Web/API/Document/getElementById
const getValue = (id) => {
    const el = document.getElementById(id);
    return el ? el.value : '';
}

document.addEventListener('DOMContentLoaded', () => {
    fetchDatabaseData();
});



// Replace your existing fetchDatabaseData function with this fixed version
async function fetchDatabaseData() {
    const tableBody = document.getElementById('database-body');
    if(!tableBody) return;

    try {
        const response = await fetch('/api/database');
        const data = await response.json();

        tableBody.innerHTML = '';
        const rows = Array.isArray(data) ? data : (data.result || []);

        if (rows.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No records found</td></tr>';
            return;
        }

        rows.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
            <td>${row.tconst}</td> 
            <td>${row.titleType}</td>
            <td>${row.primaryTitle}</td>
            <td>${row.originalTitle}</td>
            <td>${row.isAdult}</td>
            <td>${row.startYear}</td>
            <td>${row.endYear || 'N/A'}</td>
            <td>${row.runtimeMinutes}</td>
            <td>${row.genres}</td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error fetching database data:', error.message);
    }
}

async function handleInsert(){
    const data = {
       tconst: getValue('insert_id'),
       titleType: getValue('insert_TitleType'),
       primaryTitle: getValue('insert_PrimaryName'), 
       originalTitle: getValue('insert_OriginalName'), 
       isAdult: getValue('insert_Adult'), 
       startYear: getValue('insert_StartYear'), 
       endYear: getValue('insert_EndYear'), 
       runtimeMinutes: getValue('insert_RunTime'),
       genres: getValue('insert_Genre'), 
    };
    
    try {
        const response = await fetch('/api/insert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const result = await response.json();
        alert("Insert: " + result.message);
        fetchDatabaseData();
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
        alert("Update: " + result.message);
        fetchDatabaseData();
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
        alert("Delete: " + result.message);
        fetchDatabaseData();
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
        
        if(result.result && result.result.length > 0){
             alert("Record Found:\n" + JSON.stringify(result.result[0], null, 2));
        } else {
             alert("No record found (or Error): " + JSON.stringify(result));
        }
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
