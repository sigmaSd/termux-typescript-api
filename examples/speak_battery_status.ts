import { getBatteryStatus, ttsSpeak } from "@sigma/termux";

async function speakBatteryStatus() {
  const status = await getBatteryStatus();
  const message = `Your battery is at ${status.percentage} percent.`;
  await ttsSpeak({
    text: message,
  });
  console.log("Spoken:", message);
}

speakBatteryStatus();
