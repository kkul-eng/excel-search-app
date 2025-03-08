// In the App component, update the List components to use a responsive width

// Replace all List component instances with this updated version:

<List
  ref={listRef}
  width={Math.min(1000, window.innerWidth - 40)} // Responsive width
  height={400}
  rowCount={results.length}
  rowHeight={30}
  rowRenderer={rowRenderer}
  className="virtual-list"
/>

// Fix the turkceLower function to handle null values properly
const turkceLower = (text) => {
  if (!text) return '';
  const turkceKarakterler = {
    'İ': 'i', 'I': 'ı', 'Ş': 'ş', 'Ğ': 'ğ',
    'Ü': 'ü', 'Ö': 'ö', 'Ç': 'ç'
  };
  let result = text;
  for (const [upper, lower] of Object.entries(turkceKarakterler)) {
    result = result.replace(new RegExp(upper, 'g'), lower);
  }
  return result.toLowerCase();
};

// Fix the search function for esya-fihristi to handle potential null values
const search = async () => {
  if (!query.trim()) {
    showToast('Lütfen geçerli bir kelime veya ifade girin.', 'error');
    return;
  }

  try {
    setIsLoading(true);
    const response = await axios.get(`/api/${activeTab}/search`, {
      params: { query },
    });
    const data = response.data;
    console.log(`${activeTab} arama verisi:`, data);

    if (activeTab === 'gtip') {
      setResults(data);
      setSearchResultsIndices([]);
      setCurrentMatchIndex(-1);
      setShowDetail(false);
      if (!data.length) {
        showToast('Eşleşme bulunamadı.', 'error');
      }
    } else if (activeTab === 'izahname') {
      setResults(data);
      setSearchResultsIndices([]);
      setCurrentMatchIndex(-1);
      setShowDetail(false);
      if (!data.length) {
        showToast('Eşleşme bulunamadı.', 'error');
      }
    } else if (activeTab === 'tarife' || activeTab === 'esya-fihristi') {
      const matchedIndices = results.map((row, index) => {
        try {
          if (activeTab === 'tarife') {
            const col1 = turkceLower(row['1. Kolon'] || '');
            const col2 = turkceLower(row['2. Kolon'] || '');
            return col1.includes(turkceLower(query)) || col2.includes(turkceLower(query)) ? index : -1;
          } else {
            const esya = turkceLower(row['Eşya'] || '');
            const armonize = turkceLower(row['Armonize Sistem'] || '');
            const notlar = turkceLower(row['İzahname Notları'] || '');
            return esya.includes(turkceLower(query)) || armonize.includes(turkceLower(query)) || notlar.includes(turkceLower(query)) ? index : -1;
          }
        } catch (err) {
          console.error('Row processing error:', err, row);
          return -1;
        }
      }).filter(index => index !== -1);
      
      setSearchResultsIndices(matchedIndices);
      setTotalMatches(matchedIndices.length);
      setCurrentMatchIndex(matchedIndices.length > 0 ? 0 : -1);
      if (matchedIndices.length > 0 && listRef.current) {
        listRef.current.scrollToRow(matchedIndices[0], { align: 'center' });
      }
      if (!matchedIndices.length) {
        showToast('Eşleşme bulunamadı.', 'error');
      }
    }
  } catch (error) {
    console.error('Arama hatası:', error);
    showToast(`Arama sırasında bir hata oluştu: ${error.message}`, 'error');
  } finally {
    setIsLoading(false);
  }
};

// Updated rowRenderer function with proper error handling
const rowRenderer = ({ index, key, style }) => {
  try {
    const row = results[index];
    if (!row) return null;
    
    const isHighlighted = searchResultsIndices[currentMatchIndex] === index;
    const isMatch = searchResultsIndices.includes(index);

    if (activeTab === 'gtip') {
      return (
        <div key={key} style={style} className={`row ${isHighlighted ? 'highlight' : ''}`}>
          <div className="cell code">{row.Kod || ''}</div>
          <div className="cell description">{row.Tanım || ''}</div>
        </div>
      );
    } else if (activeTab === 'tarife') {
      return (
        <div key={key} style={style} className={`row ${isHighlighted ? 'highlight' : isMatch ? 'match' : ''}`}>
          <div className="cell code">{row['1. Kolon'] || ''}</div>
          <div className="cell description">{row['2. Kolon'] || ''}</div>
        </div>
      );
    } else if (activeTab === 'esya-fihristi') {
      return (
        <div key={key} style={style} className={`row ${isHighlighted ? 'highlight' : isMatch ? 'match' : ''}`}>
          <div className="cell item">{row['Eşya'] || ''}</div>
          <div className="cell harmonized">{row['Armonize Sistem'] || ''}</div>
          <div className="cell notes">{row['İzahname Notları'] || ''}</div>
        </div>
      );
    }
    return null;
  } catch (err) {
    console.error('Row rendering error:', err);
    return (
      <div key={key} style={style} className="row">
        <div className="cell">Error displaying row</div>
      </div>
    );
  }
};
