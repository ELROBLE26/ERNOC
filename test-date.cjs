const XLSX = require('xlsx');

// Create a workbook with dates
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([
  ['N° interno Bus', 'PPU', 'Taller', 'Fecha programada de ingreso'],
  [1696, 'LXWP81', 'EL ROBLE', new Date()],
  [1752, 'PFYC64', 'EL ROBLE', '02-06-26'],
]);
XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

const wb2 = XLSX.read(buf, { type: 'buffer', cellDates: true });
const ws2 = wb2.Sheets[wb2.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws2, { raw: true });
console.log("Raw true, cellDates true:", data);

const wb3 = XLSX.read(buf, { type: 'buffer' });
const ws3 = wb3.Sheets[wb3.SheetNames[0]];
const data2 = XLSX.utils.sheet_to_json(ws3, { raw: false });
console.log("Raw false, cellDates false:", data2);
