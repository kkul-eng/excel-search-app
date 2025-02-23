// GTİP Arama

async function searchGtip() {
    const query = document.getElementById('searchInputGtip').value;
    try {
        const response = await fetch(`http://localhost:3001/api/gtip/search?query=${query}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const results = await response.json();
        const resultsList = document.getElementById('resultsListGtip');
        resultsList.innerHTML = '';

        results.forEach(result => {
            const li = document.createElement('li');
            li.textContent = `${result.Kod}: ${result.Tanım}`;
            resultsList.appendChild(li);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

document.getElementById('searchButtonGtip').addEventListener('click', searchGtip);

// İzahname Arama

async function searchIzahname() {
    const query = document.getElementById('searchInputIzahname').value;
    try {
        const response = await fetch(`http://localhost:3001/api/izahname/search?query=${query}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const results = await response.json();
        const resultsList = document.getElementById('resultsListIzahname');
        resultsList.innerHTML = '';

        results.forEach(result => {
            const li = document.createElement('li');
            li.textContent = result;
            resultsList.appendChild(li);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

document.getElementById('searchButtonIzahname').addEventListener('click', searchIzahname);

// Tarife Arama

async function searchTarife() {
    const query = document.getElementById('searchInputTarife').value;
    try {
        const response = await fetch(`http://localhost:3001/api/tarife/search?query=${query}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const results = await response.json();
        const resultsList = document.getElementById('resultsListTarife');
        resultsList.innerHTML = '';

        results.forEach(result => {
            const li = document.createElement('li');
            li.textContent = result;
            resultsList.appendChild(li);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

document.getElementById('searchButtonTarife').addEventListener('click', searchTarife);

// Eşya Arama

async function searchEsya() {
    const query = document.getElementById('searchInputEsya').value;
    try {
        const response = await fetch(`http://localhost:3001/api/esya/search?query=${query}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const results = await response.json();
        const resultsList = document.getElementById('resultsListEsya');
        resultsList.innerHTML = '';

        results.forEach(result => {
            const li = document.createElement('li');
            li.textContent = result;
            resultsList.appendChild(li);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

document.getElementById('searchButtonEsya').addEventListener('click', searchEsya);
