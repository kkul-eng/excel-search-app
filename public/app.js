// Yardımcı fonksiyon: Ortak URL oluşturma ve hata mesajı gösterme
const getBaseUrl = () => {
    return window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : 'https://excel-search-app-6.onrender.com';
};

const showError = (resultsList, message) => {
    resultsList.innerHTML = `<li style="color: red;">${message}</li>`;
};

// GTİP Arama
async function searchGtip() {
    const query = document.getElementById('searchInputGtip')?.value?.trim();
    const resultsList = document.getElementById('resultsListGtip');

    if (!query) {
        if (resultsList) showError(resultsList, 'Lütfen bir arama terimi girin.');
        return;
    }
    if (!resultsList) {
        console.error('resultsListGtip bulunamadı.');
        return;
    }

    try {
        const response = await fetch(`${getBaseUrl()}/api/gtip/search?query=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Ağ yanıtı başarısız oldu');
        const results = await response.json();
        resultsList.innerHTML = '';

        if (results.length === 0) {
            showError(resultsList, 'Sonuç bulunamadı.');
            return;
        }

        results.forEach(result => {
            const li = document.createElement('li');
            li.textContent = `${result.Kod}: ${result.Tanım}`;
            resultsList.appendChild(li);
        });
    } catch (error) {
        console.error('Hata (GTİP):', error);
        showError(resultsList, `Arama sırasında bir hata oluştu: ${error.message}`);
    }
}

document.getElementById('searchButtonGtip')?.addEventListener('click', searchGtip);

// İzahname Arama
async function searchIzahname() {
    const query = document.getElementById('searchInputIzahname')?.value?.trim();
    const resultsList = document.getElementById('resultsListIzahname');

    if (!query) {
        if (resultsList) showError(resultsList, 'Lütfen bir arama terimi girin.');
        return;
    }
    if (!resultsList) {
        console.error('resultsListIzahname bulunamadı.');
        return;
    }

    try {
        const response = await fetch(`${getBaseUrl()}/api/izahname/search?query=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Ağ yanıtı başarısız oldu');
        const results = await response.json();
        resultsList.innerHTML = '';

        if (results.length === 0) {
            showError(resultsList, 'Sonuç bulunamadı.');
            return;
        }

        results.forEach(result => {
            const li = document.createElement('li');
            li.textContent = result.paragraph || result; // Backend'e bağlı olarak
            resultsList.appendChild(li);
        });
    } catch (error) {
        console.error('Hata (İzahname):', error);
        showError(resultsList, `Arama sırasında bir hata oluştu: ${error.message}`);
    }
}

document.getElementById('searchButtonIzahname')?.addEventListener('click', searchIzahname);

// Tarife Arama
async function searchTarife() {
    const query = document.getElementById('searchInputTarife')?.value?.trim();
    const resultsList = document.getElementById('resultsListTarife');

    if (!query) {
        if (resultsList) showError(resultsList, 'Lütfen bir arama terimi girin.');
        return;
    }
    if (!resultsList) {
        console.error('resultsListTarife bulunamadı.');
        return;
    }

    try {
        const response = await fetch(`${getBaseUrl()}/api/tarife/search?query=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Ağ yanıtı başarısız oldu');
        const results = await response.json();
        resultsList.innerHTML = '';

        if (results.length === 0) {
            showError(resultsList, 'Sonuç bulunamadı.');
            return;
        }

        results.forEach(result => {
            const li = document.createElement('li');
            li.textContent = result.col1 ? `${result.col1} - ${result.col2 || ''}` : result; // Örnek biçim
            resultsList.appendChild(li);
        });
    } catch (error) {
        console.error('Hata (Tarife):', error);
        showError(resultsList, `Arama sırasında bir hata oluştu: ${error.message}`);
    }
}

document.getElementById('searchButtonTarife')?.addEventListener('click', searchTarife);

// Eşya Arama
async function searchEsya() {
    const query = document.getElementById('searchInputEsya')?.value?.trim();
    const resultsList = document.getElementById('resultsListEsya');

    if (!query) {
        if (resultsList) showError(resultsList, 'Lütfen bir arama terimi girin.');
        return;
    }
    if (!resultsList) {
        console.error('resultsListEsya bulunamadı.');
        return;
    }

    try {
        const response = await fetch(`${getBaseUrl()}/api/esya/search?query=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Ağ yanıtı başarısız oldu');
        const results = await response.json();
        resultsList.innerHTML = '';

        if (results.length === 0) {
            showError(resultsList, 'Sonuç bulunamadı.');
            return;
        }

        results.forEach(result => {
            const li = document.createElement('li');
            li.textContent = result.esya ? `${result.esya} - ${result.armonize || ''}` : result; // Örnek biçim
            resultsList.appendChild(li);
        });
    } catch (error) {
        console.error('Hata (Eşya):', error);
        showError(resultsList, `Arama sırasında bir hata oluştu: ${error.message}`);
    }
}

document.getElementById('searchButtonEsya')?.addEventListener('click', searchEsya);