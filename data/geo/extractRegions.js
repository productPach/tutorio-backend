const fs = require("fs");
const path = require("path");
const readline = require("readline");
// СКРИПТ ДЛЯ ПОЛУЧЕНИЯ ВСЕХ ЗНАЧЕНИЙ В СТРОКЕ РЕГИОН ИЗ ФАЙЛА IP2LOCATION-LITE-DB3.CSV БЕЗ ДУБЛЕЙ. РЕЗУЛЬТАТЫ В uniqueRegions.json
// Путь к CSV (скрипт и CSV в одной папке data/)
const csvFilePath = path.join(__dirname, "IP2LOCATION-LITE-DB3.CSV");

if (!fs.existsSync(csvFilePath)) {
  console.error("Файл не найден:", csvFilePath);
  process.exit(1);
}

async function extractRegions() {
  const regionsSet = new Set();
  const fileStream = fs.createReadStream(csvFilePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const parts = line.split(",");
    if (parts.length >= 6) {
      const country = parts[3].replace(/"/g, "").trim();
      const region = parts[4].replace(/"/g, "").trim();
      if (country === "Russian Federation" && region) regionsSet.add(region);
    }
  }

  const regionsArray = Array.from(regionsSet).sort();
  const outPath = path.join(__dirname, "uniqueRegions.json"); // создаём рядом с CSV
  fs.writeFileSync(outPath, JSON.stringify(regionsArray, null, 2), "utf-8");
  console.log(`Saved ${regionsArray.length} regions to ${outPath}`);
}

extractRegions().catch((err) => {
  console.error(err);
  process.exit(1);
});
