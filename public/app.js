document.getElementById('searchButton').addEventListener('click', async () => {
    const query = document.getElementById('searchInput').value;
    const response = await fetch(`http://localhost:3001/api/gtip/search?query=${query}`);
    const results = await response.json();
    const resultsList = document.getElementById('resultsList');
    resultsList.innerHTML = '';

    results.forEach(result => {
        const li = document.createElement('li');
        li.textContent = `${result.Kod}: ${result.Tanım}`;
        resultsList.appendChild(li);
    });
});
