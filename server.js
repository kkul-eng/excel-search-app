const express = require('express');
const path = require('path');
const XLSX = require('xlsx');
const fs = require('fs');
const app = express();

// Render’da dosya yapısını logla
console.log('Proje kök dizini (__dirname):', __dirname);
fs.readdir(__dirname, (err, files) => {
  if (err) {
    console.error('Kök dizini okurken hata:', err);
  } else {
    console.log('Kök dizindeki dosyalar/klasörler:', files);
  }
});

// Build dosyalarını sun
const buildPath = path.join(__dirname, 'build');
console.log('Build dosyaları aranacak yol:', buildPath);
app.use(express.static(buildPath));

// Build klasörünün içeriğini logla
fs.readdir(buildPath, (err, files) => {
  if (err) {
    console.error('Build klasörünü okurken hata:', err);
  } else {
    console.log('Build klasöründeki dosyalar/klasörler:', files);
  }
});

// GTİP verisini yükle
const workbook = XLSX.readFile('gtip.xls');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const gtipData = XLSX.utils.sheet_to_json(sheet);

// Tkinter’daki kelime_arama mantığı
const kelimeArama = (data, searchText) => {
  const results = [];
  if (/^\d+$/.test(searchText)) {
    return data.filter(row => String(row.Kod || '').startsWith(searchText));
  } else {
    const searchKeywords = searchText.split(' ');
    return data.filter(row => {
      const description = (row.Tanım || '').toLowerCase();
      return searchKeywords.every(keyword => description.includes(keyword));
    });
  }
};

// GTİP arama endpoint’i
app.get('/api/gtip/search', (req, res) => {
  const query = (req.query.query || '').toLowerCase();
  if (!query) return res.json([]);
  const results = kelimeArama(gtipData, query);
  res.json(results);
});

// Tüm diğer istekleri React’a yönlendir
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'build', 'index.html');
  console.log('İstek için index.html yolu:', indexPath);
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('index.html gönderilirken hata:', err);
      res.status(500).send('Sunucu hatası: index.html bulunamadı');
    }
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});