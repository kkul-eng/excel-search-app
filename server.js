const express = require('express');
const path = require('path');
const XLSX = require('xlsx');
const fs = require('fs');
const app = express();

// React build dosyalarını sun
const buildPath = path.join(__dirname, 'build');
console.log('Build dosyaları aranacak yol:', buildPath);
app.use(express.static(buildPath));

// Excel dosyalarını yükle
const gtipData = XLSX.utils.sheet_to_json(XLSX.readFile('gtip.xls').Sheets[XLSX.readFile('gtip.xls').SheetNames[0]]);
const izahnameData = XLSX.utils.sheet_to_json(XLSX.readFile('izahname.xlsx').Sheets[XLSX.readFile('izahname.xlsx').SheetNames[0]]);
const tarifeData = XLSX.utils.sheet_to_json(XLSX.readFile('index.xlsx').Sheets[XLSX.readFile('index.xlsx').SheetNames[0]], { defval: '' });
const esyaFihristiData = XLSX.utils.sheet_to_json(XLSX.readFile('alfabetik_fihrist.xlsx').Sheets[XLSX.readFile('alfabetik_fihrist.xlsx').SheetNames[0]], { defval: '' });

// Türkçe lowercase dönüşümü
const turkceLower = (text) => {
  const turkceKarakterler = {
    'İ': 'i', 'I': 'ı', 'Ş': 'ş', 'Ğ': 'ğ',
    'Ü': 'ü', 'Ö': 'ö', 'Ç': 'ç'
  };
  let result = text || '';
  for (const [upper, lower] of Object.entries(turkceKarakterler)) {
    result = result.replace(new RegExp(upper, 'g'), lower);
  }
  return result.toLowerCase();
};

// Tkinter'daki kelime_arama mantığı
const kelimeArama = (data, searchText, columns) => {
  const results = [];
  if (!searchText) return data; // Boşsa tüm veriyi dön

  if (/^\d+$/.test(searchText)) {
    return data.filter(row => String(row[columns[0]] || '').startsWith(searchText));
  } else {
    const searchKeywords = searchText.split(' ');
    return data.filter(row => {
      const text = columns.map(col => turkceLower(row[col] || '')).join(' ');
      return searchKeywords.every(keyword => text.includes(keyword));
    });
  }
};

// GTİP arama endpoint’i
app.get('/api/gtip/search', (req, res) => {
  const query = turkceLower(req.query.query || '');
  const results = kelimeArama(gtipData, query, ['Kod', 'Tanım']);
  res.json(results);
});

// İzahname arama endpoint’i
app.get('/api/izahname/search', (req, res) => {
  const query = turkceLower(req.query.query || '');
  const results = izahnameData.filter(row => {
    const paragraph = turkceLower(row.paragraf || row.paragraph || '');
    return query.split(' ').every(keyword => paragraph.includes(keyword));
  });
  res.json(results.map(row => ({
    index: row.index,
    paragraph: row.paragraf || row.paragraph || ''
  })));
});

// İzahname detay endpoint’i
app.get('/api/izahname/context', (req, res) => {
  const index = parseInt(req.query.index, 10);
  const actualIndex = izahnameData.findIndex(row => row.index === index);
  if (actualIndex === -1) {
    res.status(404).json({ error: 'Index bulunamadı' });
    return;
  }

  const startIndex = Math.max(0, actualIndex - 25);
  const endIndex = Math.min(izahnameData.length - 1, actualIndex + 25);
  const context = izahnameData.slice(startIndex, endIndex + 1).map(row => ({
    paragraph: row.paragraf || row.paragraph || '',
    isBold: row.index === index
  }));

  res.json(context);
});

// Tarife arama endpoint’i
app.get('/api/tarife/search', (req, res) => {
  const query = turkceLower(req.query.query || '');
  const results = kelimeArama(tarifeData, query, ['col1', 'col2']);
  res.json(results);
});

// Eşya Fihristi arama endpoint’i
app.get('/api/esya-fihristi/search', (req, res) => {
  const query = turkceLower(req.query.query || '');
  const results = kelimeArama(esyaFihristiData, query, ['esya', 'armonize', 'notlar']);
  res.json(results);
});

// Tüm diğer istekleri React’a yönlendir
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'build', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('index.html gönderilirken hata:', err);
      res.status(500).send('Sunucu hatası');
    }
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
