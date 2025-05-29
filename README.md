# Termux API wrapper for typescript (cross runtimes).

This module provides TypeScript interfaces and functions to interact with the
Termux:API suite on Android devices. Each function corresponds to a Termux API
command, providing a typed, promise-based interface for scripting and utomation.

- All functions are asynchronous and return Promises.
- Some functions initiate UI interactions on the Android device (e.g., dialogs,
  notifications, sharing).
- Many APIs require the Termux:API app to be installed and permissions granted.

## Example

```ts
import { getBatteryStatus, getLocation, showToast } from "./termux-api.ts";

// Show a toast message
await showToast({ message: "Hello from Termux API!", shortDuration: true });

// Get battery status
const battery = await getBatteryStatus();
console.log("Battery status:", battery);

// Get current location
const location = await getLocation();
console.log("Location:", location);
```
