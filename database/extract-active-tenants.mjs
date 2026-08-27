import xlsx from 'xlsx';
import path from 'path';

const excelPath = path.resolve('../INCOME AND EXPENSES PAST RECORDS/Michelles-BH-Report-Income-and-Expenses-fr-Yr-2024-up (1) (1) (1).xlsx');
const workbook = xlsx.readFile(excelPath);
const sheet = workbook.Sheets['Monthly Income'];
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

const monthNames = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

let activeYear = 2024;
let activeMonth = 1;
let activeCluster = 'BH';

const parsedRecords = [];

for (let idx = 0; idx < rows.length; idx++) {
  const row = rows[idx];
  if (!row || row.length === 0) continue;

  const cell0 = row[0] ? String(row[0]).trim() : '';
  const cell1 = row[1] ? String(row[1]).trim() : '';
  const cell2 = row[2] ? String(row[2]).trim() : '';

  if (cell0 === 'BH' && cell1) {
    activeCluster = 'BH';
    const cleanDateStr = cell1.toLowerCase().replace(/['"]/g, '').trim();
    const yrMatch = cleanDateStr.match(/\b(202\d)\b/);
    if (yrMatch) activeYear = parseInt(yrMatch[1], 10);
    const foundMonth = monthNames.findIndex(m => cleanDateStr.includes(m));
    if (foundMonth !== -1) activeMonth = foundMonth + 1;
    continue;
  }

  if (cell0 && !row[1] && !row[2] && !row[3] && !row[4]) {
    const lowerCell0 = cell0.toLowerCase();
    if (lowerCell0 === 'back apartment') activeCluster = 'Back Apartment';
    else if (lowerCell0 === 'pent house' || lowerCell0 === 'penthouse') activeCluster = 'Penthouse';
    else if (lowerCell0 === 'front apartment') activeCluster = 'Front Apartment';
    else if (lowerCell0 === 'linda') activeCluster = 'Linda';
    continue;
  }

  if (cell0 === 'Rm #') continue;

  if (cell0) {
    let roomNum = cell0;
    if (roomNum.startsWith('*')) roomNum = roomNum.substring(1);
    
    // Check if vacant
    const isVacant = cell2.toUpperCase() === 'VACANT';
    const tenantName = isVacant ? null : cell2;

    let parsedName = null;
    if (tenantName) {
      const orMatch = tenantName.match(/(.*)\b(OR#|OR|O#|OR #)(\d+)(.*)/i);
      parsedName = orMatch ? orMatch[1].trim() : tenantName.trim();
    }

    parsedRecords.push({
      roomNum: roomNum.toLowerCase(),
      cluster: activeCluster,
      year: activeYear,
      month: activeMonth,
      isVacant,
      tenantName: parsedName,
      rentAmount: parseFloat(row[4]) || 0
    });
  }
}

// Find the latest active tenant for each room number
const latestRooms = {};
parsedRecords.forEach(r => {
  const current = latestRooms[r.roomNum];
  const isLater = !current || 
                  (r.year > current.year) || 
                  (r.year === current.year && r.month > current.month);
  if (isLater) {
    latestRooms[r.roomNum] = r;
  }
});

console.log('--- LATEST ROOM STATUSES ---');
const roomList = Object.values(latestRooms).sort((a, b) => a.roomNum.localeCompare(b.roomNum));
roomList.forEach(r => {
  console.log(`Room: ${r.roomNum.padEnd(5)} | Status: ${r.isVacant ? 'VACANT' : 'OCCUPIED'.padEnd(8)} | Tenant: ${(r.tenantName || 'N/A').padEnd(30)} | Rent: ${r.rentAmount} | Date: ${monthNames[r.month - 1]} ${r.year}`);
});

console.log(`\nTotal unique rooms status: ${roomList.length}`);
console.log(`Occupied rooms: ${roomList.filter(r => !r.isVacant).length}`);
console.log(`Vacant rooms: ${roomList.filter(r => r.isVacant).length}`);
