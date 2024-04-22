const unzipper = require("unzipper");
const axios = require("axios");
const fs = require("fs");

// Функция загрузки файла по прямой ссылке
async function downloadFile(fileId, filePath, bot) {
  const fileLink = await bot.telegram.getFileLink(fileId);
  const response = await axios.get(fileLink, { responseType: "stream" });
  const writer = fs.createWriteStream(filePath);
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

// Функция извлечения файлов из zip-архива
async function extractFiles(zipFilePath, extractTo) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(zipFilePath)
      .pipe(unzipper.Extract({ path: extractTo }))
      .on("error", reject)
      .on("finish", resolve);
  });
}

module.exports = { downloadFile, extractFiles };
