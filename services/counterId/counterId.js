const { getMongoDb } = require("../../mongo/mongo");

async function getNextSequence(name) {
  const db = await getMongoDb();

  const result = await db
    .collection("counters")
    .findOneAndUpdate(
      { _id: name },
      { $inc: { seq: 1 } },
      { returnDocument: "after", upsert: true }
    );

  // Если запись только создалась (undefined), начинаем с 1000
  if (!result.value) {
    await db
      .collection("counters")
      .updateOne({ _id: name }, { $set: { seq: 1000 } });
    return "1000";
  }

  return result.value.seq.toString();
}

module.exports = { getNextSequence };
