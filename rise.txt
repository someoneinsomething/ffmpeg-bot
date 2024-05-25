async function deleteImages() {
  const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
  }

  const token = document.getElementById("token").value;

  const images = document.querySelectorAll("[image_id]");

  const session = getCookie("sess_name");

  for (let i = 0; i < images.length; i++) {
    const item = images[i];

    const imageId = item.attributes.image_id.value;

    try {
      await fetch("https://app.social-rise.com/includes/handler.inc.php", {
        headers: {
          accept: "*/*",
          "accept-language": "en-US,en;q=0.9",
          "content-type":
            "multipart/form-data; boundary=----WebKitFormBoundarynUAhunPb59t5wJAz",
          "sec-ch-ua":
            '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"macOS"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "x-requested-with": "XMLHttpRequest",
          cookie: `sess_name=${session};`,
          Referer: "https://app.social-rise.com/gallery",
          "Referrer-Policy": "strict-origin-when-cross-origin",
        },
        body: `------WebKitFormBoundarynUAhunPb59t5wJAz\r\nContent-Disposition: form-data; name="image_id"\r\n\r\n${imageId}\r\n------WebKitFormBoundarynUAhunPb59t5wJAz\r\nContent-Disposition: form-data; name="action"\r\n\r\ndelete\r\n------WebKitFormBoundarynUAhunPb59t5wJAz\r\nContent-Disposition: form-data; name="auth"\r\n\r\n${token}_image\r\n------WebKitFormBoundarynUAhunPb59t5wJAz--\r\n`,
        method: "POST",
      });

      console.log(`${i + 1}/${images.length} Deleted`);

      await sleep(1000);
    } catch (e) {
      console.log(`${i + 1}/${images.length} Not deleted: ${e.message}`);
    }
  }
}

deleteImages();
