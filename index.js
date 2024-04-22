const { Telegraf } = require("telegraf");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

const { downloadFile, extractFiles } = require("./file");
const { getRandomBrightness } = require("./utils");

ffmpeg.setFfmpegPath(ffmpegPath);

// Замени значения на свои токены и пути к файлам
const BOT_TOKEN = "6994063348:AAGAjAuHBEqu_0GFmBFNNfEXmORE0U3BD-g";
const ARCHIVE_PATH = path.join(__dirname, "archive.zip");
const TEMP_FOLDER = path.join(__dirname, "temp");

// Создаем папку temp, если она еще не создана
if (!fs.existsSync(TEMP_FOLDER)) {
  fs.mkdirSync(TEMP_FOLDER);
}

// Создаем бота с вашим токеном
const bot = new Telegraf(BOT_TOKEN);

// Обработчик команды /start
bot.start(
  async (ctx) =>
    await ctx.reply(
      "Привет! Отправь мне zip-архив с медиафайлами, и я их обработаю."
    )
);

// Обработчик полученного zip-архива
bot.on("document", async (ctx) => {
  const document = ctx.message.document;

  if (!fs.existsSync(TEMP_FOLDER)) {
    fs.mkdirSync(TEMP_FOLDER);
  }

  try {
    const zipFileName = document.file_name;
    const zipFilePath = path.join(TEMP_FOLDER, zipFileName);
    const extractedFolder = path.join(TEMP_FOLDER, "extracted");

    // Получаем прямую ссылку на файл и загружаем его
    await downloadFile(document.file_id, zipFilePath, bot);

    await ctx.reply("[1/5] Файл загружен");

    // Извлекаем файлы из архива
    await extractFiles(zipFilePath, extractedFolder);

    await ctx.reply("[2/5] Медиафайлы разархивированы");

    // Обрабатываем видео
    await processVideos(ctx, extractedFolder);

    await ctx.reply("[4/5] Медиафайлы обработаны");

    // Отправляем архив с обработанными видео
    await sendArchive(ctx, zipFileName);
  } catch (err) {
    console.error("Error processing zip archive:", err);
    if (err?.response?.description === "Bad Request: file is too big") {
      return await ctx.reply(
        "Произошла ошибка при обработке zip-архива. Архив слишком большой"
      );
    }

    return await ctx.reply("Произошла ошибка при обработке zip-архива.");
  }
});

// Функция обработки видео
async function processVideos(ctx, folderPath) {
  const videoFiles = await getMediaFiles(folderPath);
  await ctx.reply(`[3/5] Всего найдено медиафайлов: ${videoFiles.length}`);

  let processedCount = 0;

  for (let i = 0; i < videoFiles.length; i++) {
    const videoFile = videoFiles[i];
    try {
      await applyEffect(videoFile);
      await ctx.reply(
        `[3/5] [${i + 1}/${videoFiles.length}] ${path.basename(
          videoFile
        )} обработан.`
      );
      processedCount++;
    } catch (err) {
      console.error(`Error processing video: ${videoFile}`, err);
      await ctx.reply(
        `[3/5] [${i + 1}/${videoFiles.length}] ${path.basename(
          videoFile
        )} не обработан.`
      );
    }
  }

  return processedCount;
}

// Функция получения списка видеофайлов
// async function getVideoFiles(folderPath) {
//   return new Promise((resolve, reject) => {
//     fs.readdir(folderPath, async (err, extractedFolders) => {
//       if (err) {
//         console.error("Error reading directory:", err);
//         reject(err);
//         return;
//       }

//       let videoFiles = [];

//       for (const extractedFolder of extractedFolders) {
//         const extractedFolderFullPath = path.join(folderPath, extractedFolder);
//         const filesInExtractedFolder = await fs.promises.readdir(
//           extractedFolderFullPath
//         );

//         const extractedVideoFiles = filesInExtractedFolder
//           .filter((file) => {
//             const ext = path.extname(file).toLowerCase();
//             return [
//               ".mp4",
//               ".avi",
//               ".mov",
//               ".wmv",
//               ".mkv",
//               ".flv",
//               ".webm",
//             ].includes(ext);
//           })
//           .map((file) => path.join(extractedFolderFullPath, file));

//         videoFiles = videoFiles.concat(extractedVideoFiles);
//       }

//       resolve(videoFiles);
//     });
//   });
// }

async function getMediaFiles(folderPath) {
  return new Promise((resolve, reject) => {
    fs.readdir(folderPath, async (err, extractedFolders) => {
      if (err) {
        console.error("Error reading directory:", err);
        reject(err);
        return;
      }

      let mediaFiles = [];

      for (const extractedFolder of extractedFolders) {
        const extractedFolderFullPath = path.join(folderPath, extractedFolder);
        const filesInExtractedFolder = await fs.promises.readdir(
          extractedFolderFullPath
        );

        const extractedMediaFiles = filesInExtractedFolder
          .filter((file) => {
            const ext = path.extname(file).toLowerCase();
            return [
              ".mp4",
              ".avi",
              ".mov",
              ".wmv",
              ".mkv",
              ".flv",
              ".webm",
              ".jpg",
              ".jpeg",
              ".png",
              ".gif",
              ".bmp",
            ].includes(ext);
          })
          .map((file) => path.join(extractedFolderFullPath, file));

        mediaFiles = mediaFiles.concat(extractedMediaFiles);
      }

      resolve(mediaFiles);
    });
  });
}

// Функция получения списка видеофайлов
async function getVideoFiles(folderPath) {
  return new Promise((resolve, reject) => {
    fs.readdir(folderPath, async (err, extractedFolders) => {
      if (err) {
        console.error("Error reading directory:", err);
        reject(err);
        return;
      }

      let videoFiles = [];

      for (const extractedFolder of extractedFolders) {
        const extractedFolderFullPath = path.join(folderPath, extractedFolder);

        const filesInExtractedFolder = await fs.promises.readdir(
          extractedFolderFullPath
        );

        const extractedVideoFiles = filesInExtractedFolder
          .filter((file) => {
            const ext = path.extname(file).toLowerCase();
            return [
              ".mp4",
              ".avi",
              ".mov",
              ".wmv",
              ".mkv",
              ".flv",
              ".webm",
            ].includes(ext);
          })
          .map((file) => path.join(extractedFolderFullPath, file));

        videoFiles = videoFiles.concat(extractedVideoFiles);
      }

      resolve(videoFiles);
    });
  });
}

async function applyEffect(inputPath) {
  return new Promise(async (resolve, reject) => {
    try {
      const isVideo = [
        ".mp4",
        ".avi",
        ".mov",
        ".wmv",
        ".mkv",
        ".flv",
        ".webm",
      ].includes(path.extname(inputPath).toLowerCase());
      const outputFilePath = isVideo
        ? await applyVideoEffect(inputPath)
        : await applyImageEffect(inputPath);
      resolve(outputFilePath);
    } catch (error) {
      reject(error);
    }
  });
}

async function applyVideoEffect(videoPath) {
  return new Promise((resolve, reject) => {
    try {
      const fileExt = path.extname(videoPath);
      const outputVideoPath = videoPath.replace(
        fileExt,
        "_processed" + fileExt
      ); // Создаем новый путь с измененным расширением

      const randomBrightness = getRandomBrightness();

      ffmpeg(videoPath)
        .videoFilters(`eq=brightness=${randomBrightness}`) // Увеличиваем яркость для видео
        .on("error", (err) => {
          console.error("Error applying video effect:", err);
          reject(err);
        })
        .on("end", () => {
          console.log("Effect applied to video:", videoPath);
          fs.unlinkSync(videoPath);
          fs.renameSync(outputVideoPath, videoPath);
          resolve(outputVideoPath);
        })
        .save(outputVideoPath);
    } catch (e) {
      reject(e);
    }
  });
}

async function applyImageEffect(imagePath) {
  return new Promise((resolve, reject) => {
    try {
      const fileExt = path.extname(imagePath);
      const outputImagePath = imagePath.replace(
        fileExt,
        "_processed" + fileExt
      ); // Создаем новый путь с измененным расширением

      const randomBrightness = getRandomBrightness();

      ffmpeg(imagePath)
        .outputOptions("-vf", `eq=brightness=${randomBrightness}`) // Уменьшаем яркость для изображения
        .on("error", (err) => {
          console.error("Error applying image effect:", err);
          reject(err);
        })
        .on("end", () => {
          console.log("Effect applied to image:", imagePath);
          fs.unlinkSync(imagePath);
          fs.renameSync(outputImagePath, imagePath);
          resolve(outputImagePath);
        })
        .save(outputImagePath);
    } catch (e) {
      reject(e);
    }
  });
}

// Функция применения эффекта к видео
// async function applyEffect(videoPath) {
//   return new Promise((resolve, reject) => {
//     try {
//       const fileExt = path.extname(videoPath);
//       const outputVideoPath = videoPath.replace(
//         fileExt,
//         "_processed" + fileExt
//       ); // Создаем новый путь с измененным расширением

//       ffmpeg(videoPath)
//         .videoFilters("eq=brightness=1.5") // Увеличиваем яркость
//         .on("error", (err) => {
//           console.error("Error applying effect:", err);
//           reject(err);
//         })
//         .on("end", () => {
//           console.log("Effect applied to video:", videoPath);
//           fs.unlinkSync(videoPath);
//           fs.renameSync(outputVideoPath, videoPath);
//           resolve();
//         })
//         .save(outputVideoPath);
//     } catch (e) {
//       reject(e);
//     }
//   });
// }

// Функция создания и отправки архива с обработанными видео
async function sendArchive(ctx, zipFileName) {
  const output = fs.createWriteStream(path.join(TEMP_FOLDER, zipFileName));
  const archive = archiver("zip", {});

  output.on("close", async () => {
    try {
      await ctx.replyWithDocument(
        { source: path.join(TEMP_FOLDER, zipFileName) },
        { caption: "[5/5] Обработанные медиафайлы" }
      );
      await cleanup();
    } catch (e) {
      console.error("Error while sending archive", e);
      await cleanup();
    }
  });

  archive.on("error", (err) => {
    console.error("Error creating archive:", err);
    ctx.reply("Произошла ошибка при создании архива.");
  });

  // Добавляем все файлы и папки из TEMP_FOLDER в архив
  archive.directory(path.join(TEMP_FOLDER, "extracted"), false);

  archive.pipe(output);
  archive.finalize();
}

// Функция удаления временных файлов
function cleanup() {
  return new Promise((resolve, reject) => {
    // Удаляем папку temp
    fs.rmdir(TEMP_FOLDER, { recursive: true }, (err) => {
      try {
        if (err) {
          console.error("Error deleting temp folder:", err);
          reject(err);
          return;
        }

        fs.unlinkSync(ARCHIVE_PATH);

        fs.mkdirSync(TEMP_FOLDER);

        console.log("Temp folder deleted");
      } catch (e) {
        // console.error("Error while cleanup", e);
      }
    });
  });
}

// Запускаем бот
bot.launch();

console.log("Bot launched");
