const fs = require("fs");

const start = async () => {
  const newSubsRaw = fs
    .readFileSync("./Новые саббериты.txt")
    .toString()
    .split("\n")
    .filter((item) => item);

  const oldSubsRaw = fs
    .readFileSync("./Старые саббредиты.txt")
    .toString()
    .split("\n")
    .filter((item) => item);

  const filteredSubs = newSubsRaw.filter((item) => {
    const name = item.split("/")[item.split("/").length - 1];

    if (
      oldSubsRaw.some(
        (old) =>
          old.split("/")[item.split("/").length - 1].toLowerCase() ===
          name.toLowerCase()
      )
    ) {
      return false;
    }

    return true;
  });

  console.log(newSubsRaw.length, filteredSubs.length);

  fs.writeFileSync("./Новые саббериты 2.txt", filteredSubs.join("\n"));
};

start();
