import express from 'express';
import xlsx from 'xlsx';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Türkçe karakter dönüşümü
const turkceLower = (text) => {
  const turkceKarakterler = {
    'İ': 'i', 'I': 'ı', 'Ş': 'ş', 'Ğ': 'ğ', 'Ü': 'ü', 'Ö': 'ö', 'Ç': 'ç'
  };
  let result = text;
  for (const [buyuk, kucuk] of Object.entries(turkceKarakterler)) {
    result = result.replace(new RegExp(buyuk, 'g'), kucuk);
  }
  return result.toLowerCase();
};

// Excel dosyasını yükleme fonksiyonu
const loadExcel = async (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  console.log('Yüklenen Veriler:', JSON.stringify(data, null, 2)); // Yüklenen verileri konsola yazdır
  return data;
};

// Arama fonksiyonu
const kelime_arama = (data, searchText) => {
  const results = [];
  const searchKeywords = searchText.toLowerCase().split(' ');

  data.forEach(row => {
    const description = row[1].toString().toLowerCase();
    if (searchKeywords.every(keyword => description.includes(keyword))) {
      results.push(row);
    }
  });

  return results;
};

// Excel dosyalarını yükle (config.ini’deki isimlerle)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gtipData = await loadExcel(path.join(__dirname, 'test.xlsx'));
const izahnameData = await loadExcel(path.join(__dirname, 'izahname.xlsx'));
const tarifeData = await loadExcel(path.join(__dirname, 'index.xlsx'));
const esyaFihristiData = await loadExcel(path.join(__dirname, 'alfabetik_fihrist.xlsx'));

// GTİP Arama
app.get('/api/gtip/search', (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'Arama metni gereklidir' });

  const results = kelime_arama(gtipData, query);
  res.json(results);
});

// İzahname Arama
app.get('/api/izahname/search', (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'Arama metni gereklidir' });

  const results = kelime_arama(izahnameData, query);
  res.json(results);
});

// Tarife Arama
app.get('/api/tarife/search', (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'Arama metni gereklidir' });

  const results = kelime_arama(tarifeData, query);
  res.json(results);
});

// Eşya Fihristi Arama
app.get('/api/esya-fihristi/search', (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'Arama metni gereklidir' });

  const results = kelime_arama(esyaFihristiData, query);
  res.json(results);
});

// İzahname Detay
app.get('/api/izahname/context', (req, res) => {
  const { index } = req.query;
  const actualIndex = parseInt(index);
  const startIndex = Math.max(0, actualIndex - 25);
  const endIndex = Math.min(izahnameData.length - 1, actualIndex + 25);
  const results = izahnameData
    .slice(startIndex, endIndex + 1)
    .map((row, i) => ({ index: startIndex + i, paragraph: row[0], isBold: startIndex + i === actualIndex }));
  res.json(results);
});

// Excel Search API Endpoints
const loadExcelFile = (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  return xlsx.utils.sheet_to_json(worksheet);
};

const gtipExcelData = loadExcelFile('path/to/your/gtip.xlsx');

app.get('/api/gtip/excel/search', (req, res) => {
  const { query } = req.query;
  const results = gtipExcelData.filter(item => item.Kod.includes(query) || item.Tanım.toLowerCase().includes(query.toLowerCase()));
  res.json(results);
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});