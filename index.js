const { Telegraf, Markup } = require("telegraf");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const { exec, execSync } = require("child_process");
const crypto = require("crypto");
require("dotenv").config();

const { downloadFile, extractFiles } = require("./file");
const {
  getRandomBrightness,
  getRandomSaturation,
  tweakResolution,
  getRandomNoise,
  getRandomBoxblur,
  getRandom,
} = require("./utils");

ffmpeg.setFfmpegPath(ffmpegPath);

// Замени значения на свои токены и пути к файлам
const BOT_TOKEN = process.env.BOT_TOKEN;
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

bot.action("document_filenames", async (ctx) => {
  try {
    const document = global.currentDocument;

    if (!document) {
      return await ctx.reply("Произошла ошибка при получении названий файлов.");
    }

    const zipFileName = document.file_name;
    const zipFilePath = path.join(TEMP_FOLDER, zipFileName);
    const extractedFolder = path.join(TEMP_FOLDER, "extracted");

    // Получаем прямую ссылку на файл и загружаем его
    await downloadFile(document.file_id, zipFilePath, bot);

    await ctx.reply("[1/4] Файл загружен");

    // Извлекаем файлы из архива
    await extractFiles(zipFilePath, extractedFolder);

    await ctx.reply("[2/4] Медиафайлы разархивированы");

    const successFilename = "success.txt";

    getFileNames(
      ctx,
      path.join(extractedFolder, path.parse(zipFileName).name),
      successFilename
    );

    await ctx.reply("[3/4] Медиафайлы обработаны");

    // Отправляем архив с обработанными видео

    await sendFile(ctx, successFilename, path.parse(zipFileName).name);
  } catch (e) {
    console.log(e);
    return await ctx.reply("Произошла ошибка при получении названий файлов.");
  }
});

function getFileNames(ctx, folder, successFilename) {
  function listFilesInDirectory(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        listFilesInDirectory(filePath, fileList);
      } else {
        fileList.push(path.parse(filePath).name);
      }
    });

    return fileList;
  }

  const files = listFilesInDirectory(folder);

  const fileContent = files.join("\n");

  fs.writeFileSync(path.join(folder, successFilename), fileContent);

  console.log(fileContent);
}

bot.action("document_unique", async (ctx) => {
  try {
    const document = global.currentDocument;

    if (!document) {
      return await ctx.reply("Произошла ошибка при уникализации фотографий.");
    }

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
    await processVideos(
      ctx,
      path.join(
        extractedFolder,
        path.basename(zipFileName, path.extname(zipFileName))
      )
    );

    await ctx.reply("[4/5] Медиафайлы обработаны");

    // Отправляем архив с обработанными видео
    await sendArchive(ctx, zipFileName);
  } catch (e) {
    console.log(e);

    return await ctx.reply("Произошла ошибка при уникализации фотографий.");
  }
});

// Обработчик полученного zip-архива
bot.on("document", async (ctx) => {
  const document = ctx.message.document;

  if (!fs.existsSync(TEMP_FOLDER)) {
    fs.mkdirSync(TEMP_FOLDER);
  }

  try {
    global.currentDocument = document;

    await ctx.sendMessage(
      "Что делаем с архивом?",
      Markup.inlineKeyboard([
        [Markup.button.callback("Уникализируем", "document_unique")],
        [
          Markup.button.callback(
            "Достаем названия файлов",
            "document_filenames"
          ),
        ],
      ])
    );
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
  console.log(videoFiles);
  await ctx.reply(`[3/5] Всего найдено медиафайлов: ${videoFiles.length}`);

  let processedCount = 0;

  for (let i = 0; i < videoFiles.length; i++) {
    const videoFile = videoFiles[i];
    try {
      await applyEffect(videoFile);
      await ctx.reply(
        `[3/5] [${i + 1}/${videoFiles.length}] ✅ ${path.basename(
          videoFile
        )} обработан.`
      );
      processedCount++;
    } catch (err) {
      console.error(`Error processing video: ${videoFile}`, err);
      await ctx.reply(
        `[3/5] [${i + 1}/${videoFiles.length}] ❌ ${path.basename(
          videoFile
        )} не обработан.`
      );
    }
  }

  return processedCount;
}

function sanitizeAndRenameFile(filePath, directory) {
  try {
    // Получаем базовое имя файла
    // const originalFileName = filePath.split("/").pop();

    const extension = path.extname(filePath).toLowerCase();

    const originalFileName = `image_${crypto
      .randomBytes(3)
      .toString("hex")}${extension}`;

    // Проверяем, есть ли недопустимые символы в названии файла
    // if (!/[$&*()!<>:"/\\|?* ]/g.test(originalFileName)) {
    //   return originalFileName;
    // }

    // // Убираем недопустимые символы из названия файла
    // const sanitizedFileName = originalFileName.replace(
    //   /[$&*()!<>:"/\\|?* ]/g,
    //   "_"
    // );

    const oldFilePath = `${directory}/${filePath}`;
    const newFilePath = `${directory}/${originalFileName}`;

    // Переименовываем файл
    fs.renameSync(oldFilePath, newFilePath);

    return originalFileName;
  } catch (error) {
    console.error(`Ошибка при переименовании файла: ${error}`);
    return null;
  }
}

function getMediaResolution(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      const width = metadata.streams[0].width;
      const height = metadata.streams[0].height;
      resolve({ width, height });
    });
  });
}

// async function getMediaFiles(folderPath) {
//   return new Promise((resolve, reject) => {
//     fs.readdir(folderPath, async (err, extractedFolders) => {
//       if (err) {
//         console.error("Error reading directory:", err);
//         reject(err);
//         return;
//       }

//       let mediaFiles = [];

//       for (const extractedFolder of extractedFolders) {
//         const extractedFolderFullPath = path.join(folderPath, extractedFolder);
//         const filesInExtractedFolder = await fs.promises.readdir(
//           extractedFolderFullPath
//         );

//         const extractedMediaFiles = filesInExtractedFolder
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
//               ".jpg",
//               ".jpeg",
//               ".png",
//               ".gif",
//               ".bmp",
//             ].includes(ext);
//           })
//           .map((file) => {
//             const sanitizedFilepath = sanitizeAndRenameFile(
//               file,
//               extractedFolderFullPath
//             );

//             return path.join(extractedFolderFullPath, sanitizedFilepath);
//           });

//         mediaFiles = mediaFiles.concat(extractedMediaFiles);
//       }

//       resolve(mediaFiles);
//     });
//   });
// }

async function getMediaFiles(folderPath) {
  try {
    const files = await fs.promises.readdir(folderPath);
    let mediaFiles = [];

    for (const file of files) {
      const fullPath = path.join(folderPath, file);
      const stats = await fs.promises.stat(fullPath);

      if (stats.isDirectory()) {
        const nestedMediaFiles = await getMediaFiles(fullPath);
        mediaFiles = mediaFiles.concat(nestedMediaFiles);
      } else {
        const ext = path.extname(file).toLowerCase();
        if (
          [
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
          ].includes(ext)
        ) {
          const sanitizedFilepath = sanitizeAndRenameFile(file, folderPath);
          mediaFiles.push(path.join(folderPath, sanitizedFilepath));
        }
      }
    }

    return mediaFiles;
  } catch (error) {
    console.error("Error processing directory:", error);
    throw error;
  }
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
      const randomSaturation = getRandomSaturation();

      try {
        execSync(
          `ffmpeg -i ${videoPath} -vf eq=brightness=${randomBrightness}:saturation=${randomSaturation} -map_metadata -1 ${outputVideoPath}`
        );

        console.log("Effect applied to video:", videoPath);
        fs.unlinkSync(videoPath);
        fs.renameSync(outputVideoPath, videoPath);
        return resolve(outputVideoPath);
      } catch (err) {
        console.error("Error removing metadata:", err);
        return reject(err);
      }
    } catch (e) {
      reject(e);
    }
  });
}

async function applyImageEffect(imagePath) {
  return new Promise(async (resolve, reject) => {
    try {
      const fileExt = path.extname(imagePath);
      const outputImagePath = imagePath.replace(
        fileExt,
        "_processed" + fileExt
      );

      const randomBrightness = getRandomBrightness();
      const randomSaturation = getRandomSaturation();
      const noise = getRandomNoise();
      const boxblur = getRandomBoxblur();

      const resolution = await getMediaResolution(imagePath);

      const { newWidth, newHeight } = tweakResolution(resolution);

      let text = `ffmpeg -i ${imagePath} -vf boxblur=5:${boxblur},scale=${resolution.width}:${newHeight},eq=brightness=${randomBrightness}:saturation=${randomSaturation},scale=${newWidth}:${newHeight},noise=alls=${noise}:allf=t+u`;

      for (let i = 0; i < 4; i++) {
        const uuid = crypto.randomBytes(3).toString("hex");

        let x = getRandom(15, 25);
        let y = getRandom(15, 25);

        if (i === 1) {
          y = resolution.height - y * 5;
        } else if (i === 2) {
          x = resolution.width - x * 5;
        } else if (i === 3) {
          y = resolution.height - y * 5;
          x = resolution.width - x * 5;
        }

        text += `,drawtext=text='${uuid}':fontsize=16:fontcolor=black@0.1:x=${x}:y=${y},crop=in_w:in_h-in_h*${getRandom(
          0.015,
          0.015
        )}:0:0`;
      }

      // -q:v ${getRandom(2, 5)} сжатие

      text += ` -map_metadata -1 ${outputImagePath}`;

      try {
        // execSync(
        //   `ffmpeg -i ${imagePath} -vf eq=brightness=${randomBrightness}:saturation=${randomSaturation},scale=${newWidth}:${newHeight},noise=alls=${noise}:allf=t+u,boxblur=5:${boxblur} -map_metadata -1 ${outputImagePath}`
        // );

        execSync(text);
        fs.unlinkSync(imagePath);
        fs.renameSync(outputImagePath, imagePath);
        return resolve(outputImagePath);
      } catch (err) {
        console.error("Error applying image effect:", err);
        return reject(err);
      }
    } catch (e) {
      reject(e);
    }
  });
}

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
      await ctx.reply("Ошибка при отправке архива");
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

async function sendFile(ctx, fileName, folderName) {
  // const output = fs.createWriteStream(
  //   path.join(TEMP_FOLDER, "extracted", folderName, fileName)
  // );

  // console.log(path.join(TEMP_FOLDER, "extracted", folderName, fileName));

  // output.on("close", async () => {
  try {
    await ctx.replyWithDocument(
      { source: path.join(TEMP_FOLDER, "extracted", folderName, fileName) },
      { caption: "[4/4] Обработанные медиафайлы" }
    );
    await cleanup();
  } catch (e) {
    console.error("Error while sending archive", e);
    await ctx.reply("Ошибка при отправке архива");
    await cleanup();
  }
  // });
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
