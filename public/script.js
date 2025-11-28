// Reference: https://developer.mozilla.org/en-US/docs/Web/API/Document/getElementById
const getValue = (id) => document.getElementById(id).value;

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
}
