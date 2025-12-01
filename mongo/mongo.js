const { MongoClient } = require("mongodb");

let client;
let db;

async function getMongoDb() {
  if (!db) {
    client = await MongoClient.connect(process.env.DATABASE_URL);
    db = client.db(); // база из строки
  }
  return db;
}

module.exports = { getMongoDb };
