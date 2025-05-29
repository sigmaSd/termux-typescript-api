import { getBatteryStatus, showNotification } from "../termux-api.ts";

async function notifyIfLowBattery() {
  const status = await getBatteryStatus();

  if (status.percentage && status.percentage < 20 && !status.plugged) {
    await showNotification({
      title: "Low Battery",
      content:
        `Battery is at ${status.percentage}%. Please plug in your charger!`,
      priority: "high",
      id: "low-battery-warning",
    });
    console.log("Low battery notification sent.");
  } else {
    console.log(
      `Battery is at ${status.percentage}%. No notification needed.`,
    );
  }
}

notifyIfLowBattery();
