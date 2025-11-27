// Reference: https://developer.mozilla.org/en-US/docs/Web/API/Document/getElementById
const getValue = (id) => document.getElementById(id).value;

//References: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
async function handleInsert(){
    const data = {
       id: getValue('add_id'),
       title: getValue('add_name'),
       year: getValue('add_year'),
       genre: getValue('add_genre') 
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
       id: getValue('update_id'),
       title: getValue('update_name'),
       year: getValue('update_year'),
       genre: getValue('update_genre') 
    };

    try {
        const response = await fetch('/api/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const result = await response.json();
        console.log(result);
        alert("Update: " + result.message);
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