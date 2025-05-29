# Termux API wrapper for typescript (cross runtimes)

This module provides TypeScript interfaces and functions to interact with the
Termux:API suite on Android devices. Each function corresponds to a Termux API
command, providing a typed, promise-based interface for scripting and utomation.

- All functions are asynchronous and return Promises.
- Some functions initiate UI interactions on the Android device (e.g., dialogs,
  notifications, sharing).
- Many APIs require the Termux:API app to be installed and permissions granted.

## Example

```ts
import { getBatteryStatus, getWifiConnectionInfo } from "jsr:@sigma/termux";

// Get battery status
const battery = await getBatteryStatus();
console.log("Battery status:", battery);

// Get current location
const wifiConnectionInfo = await getWifiConnectionInfo();
console.log("Local IP:", wifiConnectionInfo.ip);
```

## Meta

Uptodate with commit
https://github.com/termux/termux-api/commit/7e225c97f58018d3f78d6fae17470782aadd8c17
