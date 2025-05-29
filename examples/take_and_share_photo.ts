import { share, takePhoto } from "@sigma/termux";

async function main() {
  const outputPath = "/sdcard/DCIM/Camera/deno_photo.jpg";
  try {
    await takePhoto({
      filePath: outputPath,
    });

    console.log("Photo taken at:", outputPath);

    await share({
      filePath: outputPath,
      title: "Check out this photo!",
    });

    console.log("Photo shared!");
  } catch (err) {
    console.error("Error taking or sharing photo:", err);
  }
}

main();
