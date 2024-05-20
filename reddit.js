const axios = require("axios");
const fs = require("fs");

const start = async () => {
  const verif = [];
  const noverif = [];

  const url = "https://api.postpone.app/api/reddit/nsfw-subreddits/?limit=5000";

  const { data } = await axios.get(url);

  if (!data.result) {
    throw new Error("No Result");
  }

  const done = fs.readFileSync("./done.txt").toString().split("\n");

  const performName = (item) => {
    let name = item.split("/")[item.split("/").length - 1];

    if (name.endsWith("/")) {
      name = myString.slice(0, -1);
    }

    return name;
  };

  data.result.forEach((item) => {
    const link = `https://www.reddit.com/r/${item.name}`;

    if (done.some((old) => performName(old) === item.name.toLowerCase())) {
      console.log("filtered");
      return;
    }

    if (item.subscribers > 100000) {
      return;
    }

    if (
      item.verification_requirement === "" ||
      item.verification_requirement === "optional"
    ) {
      noverif.push({ link });
    } else if (item.verification_requirement === "required") {
      verif.push({ link });
    }
  });

  console.log(verif.length, noverif.length);

  fs.writeFileSync("noverif.txt", noverif.map((item) => item.link).join("\n"));
  fs.writeFileSync("verif.txt", verif.map((item) => item.link).join("\n"));
};

start();
