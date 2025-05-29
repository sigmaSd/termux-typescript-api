import { type ChildProcess, spawn } from "node:child_process";

// --- Helper Functions ---

/**
 * Executes a Termux API command.
 * @param commandParts Array of command parts, e.g., ['toast', '-m', 'Hello']
 * @param inputText Optional text to pipe to the command's stdin.
 * @param isJsonOutput Boolean indicating if the output is expected to be JSON.
 * @returns A promise that resolves with the command's output (parsed if JSON, string otherwise).
 */
function executeTermuxCommand(
  commandParts: string[],
  inputText?: string,
  isJsonOutput: boolean = false,
  // deno-lint-ignore no-explicit-any
): Promise<any> {
  return new Promise((resolve, reject) => {
    const commandName = commandParts[0];
    const args = commandParts.slice(1);
    const process = spawn(`termux-${commandName}`, args);

    let stdoutData = "";
    let stderrData = "";

    // deno-lint-ignore no-explicit-any
    process.stdout.on("data", (data: any) => {
      stdoutData += data.toString();
    });

    // deno-lint-ignore no-explicit-any
    process.stderr.on("data", (data: any) => {
      stderrData += data.toString();
    });

    process.on("close", (code: number) => {
      if (stderrData) {
        reject(
          new Error(
            `Termux API Error (stderr): ${stderrData.trim()}\nStdout: ${stdoutData.trim()}\nCommand: termux-${
              commandParts.join(" ")
            }`,
          ),
        );
      } else if (code !== 0 && stdoutData.trim() === "") {
        reject(
          new Error(
            `Termux API command termux-${
              commandParts.join(" ")
            } exited with code ${code}.`,
          ),
        );
      } else if (stdoutData.startsWith("ERROR:")) {
        reject(new Error(stdoutData.trim()));
      } else {
        try {
          if (isJsonOutput && stdoutData.trim()) {
            resolve(JSON.parse(stdoutData.trim()));
          } else {
            resolve(stdoutData.trim());
          }
          // deno-lint-ignore no-explicit-any
        } catch (parseError: any) {
          reject(
            new Error(
              `Failed to parse JSON output: ${stdoutData.trim()}\nError: ${parseError.message}\nStderr: ${stderrData.trim()}`,
            ),
          );
        }
      }
    });

    process.on("error", (err: Error) => {
      reject(
        new Error(
          `Failed to start Termux API command: termux-${
            commandParts.join(" ")
          }\nError: ${err.message}`,
        ),
      );
    });

    if (inputText) {
      process.stdin.write(inputText);
      process.stdin.end();
    } else {
      process.stdin.end();
    }
  });
}

/**
 * Executes a Termux API command that produces a stream of output.
 * @param commandParts Array of command parts, e.g., ['sensor', '-s', 'accelerometer']
 * @returns A ChildProcess instance. The caller is responsible for handling its stdout, stderr, and events.
 */
function streamTermuxCommand(
  commandParts: string[],
): ChildProcess {
  const commandName = commandParts[0];
  const args = commandParts.slice(1);
  const process = spawn(`termux-${commandName}`, args);
  return process;
}

// --- API Types and Functions ---

// --- Audio API ---
/**
 * Information about the device's audio system.
 * Returned by {@link getAudioInfo}.
 */
/**
 * Information about the device's audio system.
 */
export interface AudioInfo {
  /** Output sample rate property as a string. */
  PROPERTY_OUTPUT_SAMPLE_RATE: string;
  /** Output frames per buffer property as a string. */
  PROPERTY_OUTPUT_FRAMES_PER_BUFFER: string;
  /** AudioTrack sample rate. */
  AUDIOTRACK_SAMPLE_RATE: number;
  /** AudioTrack buffer size in frames. */
  AUDIOTRACK_BUFFER_SIZE_IN_FRAMES: number;
  /** AudioTrack sample rate for low latency, if available. */
  AUDIOTRACK_SAMPLE_RATE_LOW_LATENCY?: number;
  /** AudioTrack buffer size in frames for low latency, if available. */
  AUDIOTRACK_BUFFER_SIZE_IN_FRAMES_LOW_LATENCY?: number;
  /** AudioTrack sample rate for power saving, if available. */
  AUDIOTRACK_SAMPLE_RATE_POWER_SAVING?: number;
  /** AudioTrack buffer size in frames for power saving, if available. */
  AUDIOTRACK_BUFFER_SIZE_IN_FRAMES_POWER_SAVING?: number;
  /** Whether Bluetooth A2DP is on. */
  BLUETOOTH_A2DP_IS_ON: boolean;
  /** Whether a wired headset is connected. */
  WIREDHEADSET_IS_CONNECTED: boolean;
}
/**
 * Gets audio information from the device.
 * Corresponds to `termux-audio-info`.
 */
/**
 * Gets audio information from the device.
 * Corresponds to `termux-audio-info`.
 * @returns Promise resolving to {@link AudioInfo}
 */
export function getAudioInfo(): Promise<AudioInfo> {
  return executeTermuxCommand(["audio-info"], undefined, true);
}

// --- Battery Status API ---
/**
 * Battery status information.
 * Returned by {@link getBatteryStatus}.
 */
/**
 * Battery status information.
 */
export interface BatteryStatus {
  /** Whether a battery is present. */
  present: boolean;
  /** Battery technology string. */
  technology: string;
  /** Battery health status. */
  health:
    | "COLD"
    | "DEAD"
    | "GOOD"
    | "OVERHEAT"
    | "OVER_VOLTAGE"
    | "UNKNOWN"
    | "UNSPECIFIED_FAILURE"
    | string;
  /** Plugged state. */
  plugged:
    | "UNPLUGGED"
    | "PLUGGED_AC"
    | "PLUGGED_DOCK"
    | "PLUGGED_USB"
    | "PLUGGED_WIRELESS"
    | string;
  /** Charging status. */
  status: "CHARGING" | "DISCHARGING" | "FULL" | "NOT_CHARGING" | "UNKNOWN";
  /** Battery temperature in Celsius. */
  temperature: number;
  /** Battery voltage in millivolts. */
  voltage: number;
  /** Instantaneous battery current in microamperes. */
  current: number;
  /** Average battery current in microamperes, or null if unavailable. */
  current_average: number | null;
  /** Battery percentage (modern way), or null if unavailable. */
  percentage: number | null;
  /** Battery level (legacy way, use with scale). */
  level: number;
  /** Battery scale (legacy way, use with level). */
  scale: number;
  /** Battery charge counter in microampere-hours, or null if unavailable. */
  charge_counter: number | null;
  /** Battery energy in nanowatt-hours, or null if unavailable. */
  energy: number | null;
  /** Battery cycle count (Android U+), or null if unavailable. */
  cycle?: number | null;
}
/**
 * Gets the battery status of the device.
 * Corresponds to `termux-battery-status`.
 */
/**
 * Gets the battery status of the device.
 * Corresponds to `termux-battery-status`.
 * @returns Promise resolving to {@link BatteryStatus}
 */
export function getBatteryStatus(): Promise<BatteryStatus> {
  return executeTermuxCommand(["battery-status"], undefined, true);
}

// --- Brightness API ---
/**
 * Parameters for setting screen brightness.
 * Used by {@link setBrightness}.
 */
/**
 * Parameters for setting screen brightness.
 */
export interface SetBrightnessParams {
  /** Brightness level from 0 to 255. */
  brightness?: number;
  /** Enable or disable auto brightness. */
  auto?: boolean;
}
/**
 * Sets the screen brightness.
 * Corresponds to `termux-brightness`.
 */
/**
 * Sets the screen brightness.
 * Corresponds to `termux-brightness`.
 * @param params Brightness parameters
 * @returns Promise resolving to a status message
 */
export async function setBrightness(
  params: SetBrightnessParams,
): Promise<string> {
  const args: string[] = [];
  if (params.brightness !== undefined) {
    args.push("-b", params.brightness.toString());
  }
  if (params.auto !== undefined) {
    args.push("-a", params.auto.toString());
  }
  return await executeTermuxCommand(
    ["brightness", ...args],
    undefined,
    false,
  );
}

// --- Call Log API ---
/**
 * Entry in the device's call log.
 * Returned by {@link getCallLog}.
 */
/**
 * Entry in the device's call log.
 */
export interface CallLogEntry {
  /** Contact name, or "UNKNOWN_CALLER" if not found. */
  name: string;
  /** Phone number. */
  phone_number: string;
  /** Call type. */
  type:
    | "BLOCKED"
    | "INCOMING"
    | "MISSED"
    | "OUTGOING"
    | "REJECTED"
    | "VOICEMAIL"
    | "UNKNOWN_TYPE";
  /** Call date as "yyyy-MM-dd HH:mm:ss". */
  date: string;
  /** Call duration as "HH:mm:ss" or "mm:ss". */
  duration: string;
  /** SIM ID, or null if unavailable. */
  sim_id: string | null;
}
/**
 * Parameters for retrieving the call log.
 * Used by {@link getCallLog}.
 */
/**
 * Parameters for retrieving the call log.
 */
export interface GetCallLogParams {
  /** Maximum number of entries to return. */
  limit?: number;
  /** Offset for pagination. */
  offset?: number;
}
/**
 * Gets the call log.
 * Corresponds to `termux-call-log`.
 */
/**
 * Gets the call log.
 * Corresponds to `termux-call-log`.
 * @param params Optional parameters for filtering the call log
 * @returns Promise resolving to an array of {@link CallLogEntry}
 */
export async function getCallLog(
  params?: GetCallLogParams,
): Promise<CallLogEntry[]> {
  const args: string[] = [];
  if (params?.limit !== undefined) {
    args.push("-l", params.limit.toString());
  }
  if (params?.offset !== undefined) {
    args.push("-o", params.offset.toString());
  }
  return await executeTermuxCommand(["call-log", ...args], undefined, true);
}

// --- Camera Info API ---
/**
 * Camera output size in pixels.
 */
export interface CameraOutputSize {
  /** Width in pixels. */
  width: number;
  /** Height in pixels. */
  height: number;
}
/**
 * Physical size of the camera sensor.
 */
export interface CameraPhysicalSize {
  /** Width in millimeters. */
  width: number;
  /** Height in millimeters. */
  height: number;
}
/**
 * Information about a camera device.
 */
export interface CameraInfo {
  /** Camera ID string. */
  id: string;
  /** Camera facing direction ("front", "back", or numeric). */
  facing: "front" | "back" | number;
  /** Supported JPEG output sizes. */
  jpeg_output_sizes: CameraOutputSize[];
  /** Supported focal lengths. */
  focal_lengths: number[];
  /** Supported auto exposure modes. */
  auto_exposure_modes: string[];
  /** Physical sensor size. */
  physical_size: CameraPhysicalSize;
  /** Supported camera capabilities. */
  capabilities: string[];
}
/**
 * Gets information about available cameras.
 * Corresponds to `termux-camera-info`.
 */
export function getCameraInfo(): Promise<CameraInfo[]> {
  return executeTermuxCommand(["camera-info"], undefined, true);
}

// --- Camera Photo API ---
/**
 * Parameters for taking a photo.
 */
export interface TakePhotoParams {
  /** Path to save the photo. */
  filePath: string;
  /** ID of the camera to use (default: "0"). */
  cameraId?: string;
}
/**
 * Takes a photo using the specified camera.
 * Corresponds to `termux-camera-photo`.
 * @returns A promise that resolves with a success message or rejects with an error.
 */
export async function takePhoto(params: TakePhotoParams): Promise<string> {
  const args = [params.filePath];
  if (params.cameraId) {
    args.push("-c", params.cameraId);
  }
  return await executeTermuxCommand(
    ["camera-photo", ...args],
    undefined,
    false,
  );
}

// --- Clipboard API ---
/**
 * Gets the content of the clipboard.
 * Corresponds to `termux-clipboard-get`.
 */
export function clipboardGet(): Promise<string> {
  return executeTermuxCommand(["clipboard-get"], undefined, false);
}
/**
 * Sets the content of the clipboard.
 * Corresponds to `termux-clipboard-set`.
 * @param text The text to set to the clipboard.
 */
export function clipboardSet(text: string): Promise<string> {
  return executeTermuxCommand(["clipboard-set"], text, false);
}

// --- Contact List API ---
/**
 * Contact entry.
 */
export interface Contact {
  /** Contact name. */
  name: string;
  /** Contact phone number. */
  number: string;
}
/**
 * Gets the contact list.
 * Corresponds to `termux-contact-list`.
 */
export function getContactList(): Promise<Contact[]> {
  return executeTermuxCommand(["contact-list"], undefined, true);
}

// --- Dialog API ---
// This API is complex due to multiple dialog types.
// We'll define a generic structure and specific param types.

/**
 * Base result for dialog interactions.
 */
export interface DialogResultBase {
  /** Result code: -1 for OK, -2 for Cancel, -3 for Neutral. */
  code: number;
  /** Result text (for text, counter, date, time, spinner, radio, speech). */
  text?: string;
  /** Error message, if any. */
  error?: string;
}

/**
 * Result for confirm dialogs.
 */
export interface DialogConfirmResult extends DialogResultBase {
  /** "yes" or "no" for confirm dialogs. */
  text: "yes" | "no";
}

/**
 * Value for a checkbox dialog option.
 */
export interface DialogCheckboxValue {
  /** Index of the option. */
  index: number;
  /** Text of the option. */
  text: string;
}
/**
 * Result for checkbox dialogs.
 */
export interface DialogCheckboxResult extends DialogResultBase {
  /** Selected values for checkbox dialogs. */
  values?: DialogCheckboxValue[];
}

/**
 * Result for radio, spinner, or sheet dialogs.
 */
export interface DialogRadioResult extends DialogResultBase {
  /** Selected index for radio, spinner, or sheet dialogs. */
  index?: number;
}

/**
 * Result for sheet dialogs.
 */
export interface DialogSheetResult extends DialogResultBase {
  /** Selected index for sheet dialogs. */
  index?: number;
  /** Selected item text for sheet dialogs. */
  text?: string;
}

/**
 * Result type for any dialog interaction.
 */
export type DialogResult =
  | DialogConfirmResult
  | DialogCheckboxResult
  | DialogRadioResult
  | DialogSheetResult
  | DialogResultBase;

/**
 * Base parameters for dialog interactions.
 */
export interface DialogBaseParams {
  /** Dialog title. */
  title?: string;
  /** Hint text (for text, counter, date, time, speech, confirm). */
  hint?: string;
}

/**
 * Parameters for text dialogs.
 */
export interface DialogTextParams extends DialogBaseParams {
  /** Input type for the text field. */
  inputType?: "text" | "number" | "password" | "numberPassword";
  /** Allow multiple lines in the text field. */
  multipleLines?: boolean;
}

/**
 * Parameters for counter dialogs.
 */
export interface DialogCounterParams extends DialogBaseParams {
  /** Minimum value. */
  min?: number;
  /** Maximum value. */
  max?: number;
  /** Start value. */
  start?: number;
}

/**
 * Parameters for date dialogs.
 */
export interface DialogDateParams extends DialogBaseParams {
  /** Date format (Java SimpleDateFormat). */
  format?: string;
}

/**
 * Parameters for dialogs with options (checkbox, radio, spinner, sheet).
 */
export interface DialogWithOptionsParams extends DialogBaseParams {
  /** Option values for the dialog. */
  values: string[];
}

/**
 * Shows a dialog. This is a simplified wrapper.
 * For full control, you might need to call `termux-dialog` with specific subcommands.
 * Corresponds to `termux-dialog`.
 * Note: This function initiates a UI interaction on the Android device.
 */
/**
 * Shows a confirm dialog.
 * @param type The dialog type ("confirm").
 * @param params Dialog parameters.
 * @returns Promise resolving to a DialogConfirmResult.
 */
export async function showDialog(
  type: "confirm",
  params: DialogBaseParams,
): Promise<DialogConfirmResult>;
/**
 * Shows a text dialog.
 * @param type The dialog type ("text").
 * @param params Dialog parameters.
 * @returns Promise resolving to a DialogResultBase.
 */
export async function showDialog(
  type: "text",
  params: DialogTextParams,
): Promise<DialogResultBase>;
/**
 * Shows a counter dialog.
 * @param type The dialog type ("counter").
 * @param params Dialog parameters.
 * @returns Promise resolving to a DialogResultBase.
 */
export async function showDialog(
  type: "counter",
  params: DialogCounterParams,
): Promise<DialogResultBase>;
/**
 * Shows a date dialog.
 * @param type The dialog type ("date").
 * @param params Dialog parameters.
 * @returns Promise resolving to a DialogResultBase.
 */
export async function showDialog(
  type: "date",
  params: DialogDateParams,
): Promise<DialogResultBase>;
/**
 * Shows a time dialog.
 * @param type The dialog type ("time").
 * @param params Dialog parameters.
 * @returns Promise resolving to a DialogResultBase.
 */
export async function showDialog(
  type: "time",
  params: DialogBaseParams,
): Promise<DialogResultBase>;
/**
 * Shows a dialog with options (checkbox, radio, spinner, sheet).
 * @param type The dialog type.
 * @param params Dialog parameters.
 * @returns Promise resolving to a DialogCheckboxResult, DialogRadioResult, or DialogSheetResult.
 */
export async function showDialog(
  type: "checkbox" | "radio" | "spinner" | "sheet",
  params: DialogWithOptionsParams,
): Promise<DialogCheckboxResult | DialogRadioResult | DialogSheetResult>;
/**
 * Shows a speech dialog.
 * @param type The dialog type ("speech").
 * @param params Dialog parameters.
 * @returns Promise resolving to a DialogResultBase.
 */
export async function showDialog(
  type: "speech",
  params: DialogBaseParams,
): Promise<DialogResultBase>;
export function showDialog(
  type: string,
  // deno-lint-ignore no-explicit-any
  params: any,
): Promise<DialogResult> {
  const args: string[] = [type];
  if (params.title) args.push("-t", params.title);
  if (params.hint) args.push("-i", params.hint); // 'input_hint' maps to -i

  let inputText: string | undefined;

  switch (type) {
    case "text":
      if (params.multipleLines) args.push("-m");
      if (params.inputType) {
        if (params.inputType.includes("number")) args.push("-n");
        if (params.inputType.includes("password")) args.push("-p");
      }
      break;
    case "counter":
      if (
        params.min !== undefined && params.max !== undefined &&
        params.start !== undefined
      ) {
        args.push("-r", `${params.min},${params.max},${params.start}`);
      }
      break;
    case "date":
      if (params.format) args.push("-d", params.format);
      break;
    case "checkbox":
    case "radio":
    case "spinner":
    case "sheet":
      if (params.values && params.values.length > 0) {
        args.push("-v", params.values.join(","));
      }
      break;
  }
  // For dialogs that take values directly (like text input if we were to prefill)
  // or if the CLI tool expects values via stdin for some types.
  // The `termux-dialog` tool generally takes options as flags.
  // The `text` for the dialog is usually the `input_hint` or derived.
  // The actual user input happens in the Android UI.
  return executeTermuxCommand(["dialog", ...args], inputText, true);
}

// --- Download API ---
/**
 * Parameters for downloading a file.
 */
export interface DownloadParams {
  /** URL to download. */
  url: string;
  /** Download title (optional). */
  title?: string;
  /** Download description (optional). */
  description?: string;
  /** Absolute path to save the downloaded file. */
  filePath?: string;
}
/**
 * Downloads a file.
 * Corresponds to `termux-download`.
 * Note: This uses Android's DownloadManager.
 */
export function downloadFile(params: DownloadParams): Promise<string> {
  const args: string[] = [];
  if (params.title) args.push("-t", params.title);
  if (params.description) args.push("-d", params.description);
  if (params.filePath) args.push("-p", params.filePath);
  args.push(params.url); // URL is a positional argument
  return executeTermuxCommand(["download", ...args], undefined, false);
}

// --- Fingerprint API ---
/**
 * Parameters for fingerprint authentication.
 */
export interface FingerprintParams {
  /** Dialog title. */
  title?: string;
  /** Dialog description. */
  description?: string;
  /** Dialog subtitle. */
  subtitle?: string;
  /** Cancel button text. */
  cancelButtonText?: string;
}
/**
 * Result of fingerprint authentication.
 */
export interface FingerprintResult {
  /** List of error messages, if any. */
  errors: string[];
  /** Number of failed attempts. */
  failed_attempts: number;
  /** Authentication result. */
  auth_result:
    | "AUTH_RESULT_SUCCESS"
    | "AUTH_RESULT_FAILURE"
    | "AUTH_RESULT_UNKNOWN"
    | string;
}
/**
 * Initiates fingerprint authentication.
 * Corresponds to `termux-fingerprint`.
 * Note: This function initiates a UI interaction on the Android device.
 */
export function requestFingerprint(
  params?: FingerprintParams,
): Promise<FingerprintResult> {
  const args: string[] = [];
  if (params?.title) args.push("-t", params.title);
  if (params?.description) args.push("-d", params.description);
  if (params?.subtitle) args.push("-s", params.subtitle);
  if (params?.cancelButtonText) args.push("-c", params.cancelButtonText);
  return executeTermuxCommand(["fingerprint", ...args], undefined, true);
}

// --- Infrared API ---
/**
 * Range of supported infrared frequencies.
 */
export interface InfraredFrequencyRange {
  /** Minimum frequency in Hz. */
  min: number;
  /** Maximum frequency in Hz. */
  max: number;
}
/**
 * Gets available infrared carrier frequencies.
 * Corresponds to `termux-infrared-frequencies`.
 */
export function getInfraredFrequencies(): Promise<
  InfraredFrequencyRange[] | { API_ERROR: string }
> {
  return executeTermuxCommand(["infrared-frequencies"], undefined, true);
}

/**
 * Parameters for transmitting an infrared pattern.
 */
export interface TransmitInfraredParams {
  /** Carrier frequency in Hz. */
  frequency: number;
  /** Pattern of on/off durations in microseconds. */
  pattern: number[];
}
/**
 * Transmits an infrared pattern.
 * Corresponds to `termux-infrared-transmit`.
 */
export function transmitInfrared(
  params: TransmitInfraredParams,
): Promise<string | { API_ERROR: string }> {
  const patternString = params.pattern.join(",");
  return executeTermuxCommand(
    ["infrared-transmit", "-f", params.frequency.toString(), patternString],
    undefined,
    true,
  );
}

// --- Job Scheduler API ---
/**
 * Parameters for scheduling a job.
 */
export interface ScheduleJobParams {
  /** Path to the script to run. */
  scriptPath: string;
  /** Job ID (optional). */
  jobId?: number;
  /** Period in milliseconds (minimum 15 minutes for Android N+). */
  periodMs?: number;
  /** Required network type. */
  networkType?: "any" | "unmetered" | "cellular" | "not_roaming" | "none";
  /** Require battery not low (default true). */
  batteryNotLow?: boolean;
  /** Require charging. */
  charging?: boolean;
  /** Persist job across reboots. */
  persisted?: boolean;
  /** Require device idle. */
  idle?: boolean;
  /** Require storage not low. */
  storageNotLow?: boolean;
}
/**
 * Schedules a job.
 * Corresponds to `termux-job-scheduler`.
 * @returns A string containing the output from the command.
 */
export function scheduleJob(
  params: ScheduleJobParams,
): Promise<string> {
  const args = ["--script", params.scriptPath];
  if (params.jobId !== undefined) {
    args.push("--job-id", params.jobId.toString());
  }
  if (params.periodMs !== undefined) {
    args.push("--period-ms", params.periodMs.toString());
  }
  if (params.networkType) args.push("--network", params.networkType);
  if (params.batteryNotLow !== undefined) {
    args.push("--battery-not-low", params.batteryNotLow.toString());
  }
  if (params.charging !== undefined) {
    args.push("--charging", params.charging.toString());
  }
  if (params.persisted !== undefined) {
    args.push("--persisted", params.persisted.toString());
  }
  if (params.idle !== undefined) args.push("--idle", params.idle.toString());
  if (params.storageNotLow !== undefined) {
    args.push("--storage-not-low", params.storageNotLow.toString());
  }
  return executeTermuxCommand(["job-scheduler", ...args], undefined, false);
}

/**
 * Parameters for cancelling a scheduled job.
 */
export interface CancelJobParams {
  /** Job ID to cancel. */
  jobId: number;
}
/**
 * Cancels a specific job.
 * Corresponds to `termux-job-scheduler --cancel --job-id <id>`.
 */
export function cancelJob(params: CancelJobParams): Promise<string> {
  return executeTermuxCommand(
    ["job-scheduler", "--cancel", "--job-id", params.jobId.toString()],
    undefined,
    false,
  );
}

/**
 * Cancels all scheduled jobs.
 * Corresponds to `termux-job-scheduler --cancel-all`.
 */
export function cancelAllJobs(): Promise<string> {
  return executeTermuxCommand(
    ["job-scheduler", "--cancel-all"],
    undefined,
    false,
  );
}

/**
 * Lists all pending jobs.
 * Corresponds to `termux-job-scheduler --pending`.
 */
export function listPendingJobs(): Promise<string> {
  return executeTermuxCommand(
    ["job-scheduler", "--pending"],
    undefined,
    false,
  );
}

// --- Location API ---
/**
 * Information about a device location fix.
 */
export interface LocationInfo {
  /** Latitude in degrees. */
  latitude: number;
  /** Longitude in degrees. */
  longitude: number;
  /** Altitude in meters. */
  altitude: number;
  /** Horizontal accuracy in meters. */
  accuracy: number;
  /** Vertical accuracy in meters (Android O+). */
  vertical_accuracy?: number;
  /** Bearing in degrees. */
  bearing: number;
  /** Speed in meters/second. */
  speed: number;
  /** Milliseconds since boot for this location fix. */
  elapsedMs: number;
  /** Provider used for this fix. */
  provider: "gps" | "network" | "passive" | string;
  /** API error message, if any. */
  API_ERROR?: string;
}
/**
 * Parameters for getting device location.
 */
export interface GetLocationParams {
  /** Location provider to use. */
  provider?: "gps" | "network" | "passive";
  /** Request type: "last", "once", or "updates". */
  requestType?: "last" | "once" | "updates";
}
/**
 * Gets the device location.
 * For 'updates', use `streamLocationUpdates` instead.
 * Corresponds to `termux-location`.
 */
export function getLocation(
  params?: GetLocationParams,
): Promise<LocationInfo> {
  const args: string[] = [];
  if (params?.provider) args.push("-p", params.provider);
  if (params?.requestType && params.requestType !== "updates") {
    args.push("-r", params.requestType);
  } else if (!params?.requestType) args.push("-r", "once"); // Default to 'once' if not specified

  if (params?.requestType === "updates") {
    throw new Error(
      "For location updates, please use the streamLocationUpdates() function.",
    );
  }

  return executeTermuxCommand(["location", ...args], undefined, true);
}
/**
 * Streams location updates.
 * Corresponds to `termux-location -p <provider> -r updates`.
 * @param provider The location provider to use.
 * @returns A ChildProcess. Handle its 'stdout' for JSON LocationInfo objects.
 */
export function streamLocationUpdates(
  provider: "gps" | "network" | "passive" = "gps",
): ChildProcess {
  return streamTermuxCommand(["location", "-p", provider, "-r", "updates"]);
}

// --- Media Player API ---
/**
 * Media player actions.
 */
export type MediaPlayerAction = "play" | "pause" | "resume" | "stop" | "info";
/**
 * Parameters for controlling the media player.
 */
export interface MediaPlayerCommandParams {
  /** Action to perform. */
  action: MediaPlayerAction;
  /** File path or URL, required for 'play' action. */
  filePath?: string;
}
/**
 * Controls media playback.
 * Corresponds to `termux-media-player`.
 * @returns A string containing the output from the command.
 */
export function mediaPlayerControl(
  params: MediaPlayerCommandParams,
): Promise<string> {
  const command: string[] = ["media-player", params.action as string];
  if (params.action === "play" && params.filePath) {
    command.push(params.filePath);
  } else if (params.action === "play" && !params.filePath) {
    return Promise.reject(
      new Error("filePath is required for 'play' action."),
    );
  }
  return executeTermuxCommand(command, undefined, false);
}

// --- Media Scanner API ---
/**
 * Parameters for scanning media files.
 */
export interface MediaScanParams {
  /** Paths to scan. */
  paths: string[];
  /** Scan recursively. */
  recursive?: boolean;
  /** Verbose output. */
  verbose?: boolean;
}
/**
 * Scans media files, making them available to the Android MediaStore.
 * Corresponds to `termux-media-scan`.
 * @returns A string containing the output from the command.
 */
export function mediaScan(params: MediaScanParams): Promise<string> {
  const args: string[] = [];
  if (params.recursive) args.push("-r");
  if (params.verbose) args.push("-v");
  args.push(...params.paths);
  return executeTermuxCommand(["media-scan", ...args], undefined, false);
}

// --- Mic Recorder API ---
/**
 * Microphone recorder actions.
 */
export type MicRecorderAction = "info" | "record" | "quit";
/**
 * Parameters for microphone recording.
 */
export interface MicRecorderRecordParams {
  /** Output file path (optional). */
  filePath?: string;
  /** Recording time limit in seconds (0 or negative for unlimited). */
  limitSeconds?: number;
  /** Audio encoder to use. */
  encoder?: "aac" | "amr_nb" | "amr_wb" | "opus";
  // format, source, bitrate, srate, channels are also available but more advanced
}
/**
 * Information about microphone recording state.
 */
export interface MicRecorderInfo {
  /** Whether recording is active. */
  isRecording: boolean;
  /** Output file path, if recording. */
  outputFile?: string;
}
/**
 * Controls microphone recording.
 * Corresponds to `termux-microphone-record`.
 */
/**
 * Gets microphone recording info.
 * @param action The action ("info").
 * @returns Promise resolving to MicRecorderInfo.
 */
export async function micRecord(action: "info"): Promise<MicRecorderInfo>;
/**
 * Starts microphone recording.
 * @param action The action ("record").
 * @param params Recording parameters.
 * @returns Promise resolving to a status message.
 */
export async function micRecord(
  action: "record",
  params?: MicRecorderRecordParams,
): Promise<string>;
/**
 * Stops microphone recording.
 * @param action The action ("quit").
 * @returns Promise resolving to a status message.
 */
export async function micRecord(action: "quit"): Promise<string>;
export function micRecord(
  action: MicRecorderAction,
  params?: MicRecorderRecordParams,
): Promise<string | MicRecorderInfo> {
  const args = [`-${action.charAt(0)}`]; // -i for info, -r for record, -q for quit
  if (action === "record" && params) {
    if (params.filePath) args.push("-f", params.filePath);
    if (params.limitSeconds !== undefined) {
      args.push("-l", params.limitSeconds.toString());
    }
    if (params.encoder) args.push("-e", params.encoder);
  }
  const isJson = action === "info";
  return executeTermuxCommand(
    ["microphone-record", ...args],
    undefined,
    isJson,
  );
}

// --- NFC API ---
// NFC interactions are complex and UI-dependent. This provides a basic way to trigger.
/**
 * NFC read modes.
 */
export type NfcReadMode = "short" | "full";
/**
 * Parameters for reading NFC tags.
 */
export interface NfcReadParams {
  /** Read mode ("short" or "full"). */
  mode?: NfcReadMode;
  // timeout?: number; // CLI might have a timeout option
}
/**
 * Parameters for writing to NFC tags.
 */
export interface NfcWriteParams {
  /** Text to write to the tag. */
  text: string;
  // timeout?: number;
}
/**
 * Reads data from an NFC tag.
 * Corresponds to `termux-nfc -r [-m <mode>]`.
 * Note: This function initiates a UI interaction on the Android device to scan an NFC tag.
 */
// deno-lint-ignore no-explicit-any
export function nfcRead(params?: NfcReadParams): Promise<any> { // Output structure varies
  const args = ["-r"];
  if (params?.mode) args.push("-m", params.mode);
  return executeTermuxCommand(["nfc", ...args], undefined, true);
}
/**
 * Writes text data to an NFC tag.
 * Corresponds to `termux-nfc -w <text>`.
 * Note: This function initiates a UI interaction on the Android device to scan an NFC tag.
 */
export function nfcWrite(params: NfcWriteParams): Promise<string> {
  return executeTermuxCommand(["nfc", "-w", params.text], undefined, false);
}

// --- Notification API ---
/**
 * Notification priority levels.
 */
export type NotificationPriority = "default" | "high" | "low" | "max" | "min";
/**
 * Button for a notification.
 */
export interface NotificationButton {
  /** Button text. */
  text: string;
  /** Action string, can include $REPLY for reply buttons. */
  action: string;
}
/**
 * Parameters for showing a notification.
 */
export interface NotificationParams {
  /** Notification content (sent via stdin). */
  content: string;
  /** Notification title. */
  title?: string;
  /** Notification ID. */
  id?: string;
  /** Notification priority. */
  priority?: NotificationPriority;
  /** LED color (ARGB hex). */
  ledColor?: string;
  /** LED on duration in ms. */
  ledOnMs?: number;
  /** LED off duration in ms. */
  ledOffMs?: number;
  /** Vibrate pattern in ms. */
  vibratePattern?: number[];
  /** Use default notification sound. */
  sound?: boolean;
  /** Make notification ongoing. */
  ongoing?: boolean;
  /** Alert only once. */
  alertOnce?: boolean;
  /** Script to run on click. */
  action?: string;
  /** Notification group key. */
  groupKey?: string;
  /** Notification channel ID. */
  channelId?: string;
  /** Icon name. */
  iconName?: string;
  /** Absolute path to an image file. */
  imagePath?: string;
  /** Notification type ("media" for media style). */
  type?: "media";
  /** Media previous action script. */
  mediaPreviousAction?: string;
  /** Media pause action script. */
  mediaPauseAction?: string;
  /** Media play action script. */
  mediaPlayAction?: string;
  /** Media next action script. */
  mediaNextAction?: string;
  /** Notification buttons (max 3). */
  buttons?: NotificationButton[];
  /** Script to run on notification dismissal. */
  onDeleteAction?: string;
}
/**
 * Shows a notification.
 * Corresponds to `termux-notification`.
 */
export function showNotification(
  params: NotificationParams,
): Promise<string> {
  const args: string[] = [];
  if (params.title) args.push("--title", params.title);
  if (params.id) args.push("--id", params.id);
  if (params.priority) args.push("--priority", params.priority);
  if (params.ledColor) args.push("--led-color", params.ledColor);
  if (params.ledOnMs !== undefined) {
    args.push("--led-on", params.ledOnMs.toString());
  }
  if (params.ledOffMs !== undefined) {
    args.push("--led-off", params.ledOffMs.toString());
  }
  if (params.vibratePattern) {
    args.push("--vibrate", params.vibratePattern.join(","));
  }
  if (params.sound) args.push("--sound");
  if (params.ongoing) args.push("--ongoing");
  if (params.alertOnce) args.push("--alert-once");
  if (params.action) args.push("--action", params.action);
  if (params.groupKey) args.push("--group", params.groupKey);
  if (params.channelId) args.push("--channel", params.channelId);
  if (params.iconName) args.push("--icon", params.iconName);
  if (params.imagePath) args.push("--image-path", params.imagePath);
  if (params.type === "media") {
    args.push("--type", "media");
    if (params.mediaPreviousAction) {
      args.push("--media-previous", params.mediaPreviousAction);
    }
    if (params.mediaPauseAction) {
      args.push("--media-pause", params.mediaPauseAction);
    }
    if (params.mediaPlayAction) {
      args.push("--media-play", params.mediaPlayAction);
    }
    if (params.mediaNextAction) {
      args.push("--media-next", params.mediaNextAction);
    }
  }
  params.buttons?.forEach((btn, i) => {
    if (i < 3) {
      args.push(`--button${i + 1}-text`, btn.text);
      args.push(`--button${i + 1}-action`, btn.action);
    }
  });
  if (params.onDeleteAction) args.push("--on-delete", params.onDeleteAction);

  // Content is passed via stdin, so use the second argument of executeTermuxCommand
  return executeTermuxCommand(
    ["notification", ...args],
    params.content,
    false,
  );
}

/**
 * Removes a notification by its ID.
 * Corresponds to `termux-notification-remove <id>`.
 */
export function removeNotification(
  notificationId: string,
): Promise<string> {
  return executeTermuxCommand(
    ["notification-remove", notificationId],
    undefined,
    false,
  );
}

/**
 * Parameters for creating a notification channel.
 */
export interface NotificationChannelParams {
  /** Channel ID. */
  id: string;
  /** Channel name. */
  name: string;
  /** Channel priority. */
  priority?: NotificationPriority;
}
/**
 * Creates a notification channel (Android 8.0+).
 * Corresponds to `termux-notification-channel-create`. (Hypothetical, actual CLI might differ)
 */
export function createNotificationChannel(
  params: NotificationChannelParams,
): Promise<string> {
  const args = ["--id", params.id, "--name", params.name];
  if (params.priority) args.push("--priority", params.priority);
  // Assuming a subcommand or specific tool like 'termux-notification-channel'
  return executeTermuxCommand(
    ["notification-channel", ...args],
    undefined,
    false,
  );
}

/**
 * Deletes a notification channel (Android 8.0+).
 * Corresponds to `termux-notification-channel-delete`. (Hypothetical)
 */
export function deleteNotificationChannel(
  channelId: string,
): Promise<string> {
  return executeTermuxCommand(
    ["notification-channel", "--id", channelId, "--delete"],
    undefined,
    false,
  );
}

// --- Notification List API ---
/**
 * Entry for an active notification.
 */
export interface NotificationEntry {
  /** Notification ID. */
  id: number;
  /** Notification tag, if any. */
  tag: string | null;
  /** Notification key. */
  key: string;
  /** Notification group, if any. */
  group: string | null;
  /** Package name of the app posting the notification. */
  packageName: string;
  /** Notification title. */
  title: string;
  /** Notification content. */
  content: string;
  /** When the notification was posted ("yyyy-MM-dd HH:mm:ss"). */
  when: string;
  /** Lines of content, if multi-line. */
  lines?: string[];
}
/**
 * Lists active notifications.
 * Note: Requires Notification Listener permission for Termux:API app.
 * Corresponds to `termux-notification-list`.
 */
export function listNotifications(): Promise<NotificationEntry[]> {
  return executeTermuxCommand(["notification-list"], undefined, true);
}

// --- Sensor API ---
/**
 * List of available sensors.
 */
export interface SensorList {
  /** Array of sensor names. */
  sensors: string[];
}
/**
 * Sensor readout values.
 */
/**
 * Sensor readout values.
 * The index signature is the sensor name, and the value is an object with a `values` array.
 * Example: `{ "accelerometer": { values: [0.1, 9.8, 0.0] } }`
 */
export interface SensorReadout {
  /**
   * Sensor name as key, value is an object with a `values` array.
   * @example
   * {
   *   "accelerometer": { values: [0.1, 9.8, 0.0] }
   * }
   */
  [sensorName: string]: {
    /** Array of sensor values. */
    values: number[];
  };
}
/**
 * Lists available sensors.
 * Corresponds to `termux-sensor -l`.
 */
export function listSensors(): Promise<SensorList> {
  return executeTermuxCommand(["sensor", "-l"], undefined, true);
}
/**
 * Cleans up active sensor listeners.
 * Corresponds to `termux-sensor -c`.
 */
export function cleanupSensors(): Promise<string> {
  return executeTermuxCommand(["sensor", "-c"], undefined, false);
}
/**
 * Parameters for streaming sensor data.
 */
export interface StreamSensorsParams {
  /** Comma-separated list of sensor names or 'all'. */
  sensors: string;
  /** Delay in milliseconds between readings. */
  delay?: number;
  /** Number of readings before stopping. */
  limit?: number;
}
/**
 * Streams sensor data.
 * Corresponds to `termux-sensor -s <sensors> [-d <delay>] [-n <limit>]`.
 * @returns A ChildProcess. Handle its 'stdout' for JSON SensorReadout objects.
 */
export function streamSensorData(params: StreamSensorsParams): ChildProcess {
  const args = ["-s", params.sensors];
  if (params.delay !== undefined) args.push("-d", params.delay.toString());
  if (params.limit !== undefined) args.push("-n", params.limit.toString()); // -n for limit in CLI
  return streamTermuxCommand(["sensor", ...args]);
}

// --- Share API ---
/**
 * Parameters for sharing content or files.
 */
export interface ShareParams {
  /** Text content to share (if filePath is not provided). */
  text?: string;
  /** Absolute path to a file to share. */
  filePath?: string;
  /** Share dialog title. */
  title?: string;
  /** MIME type of the content. */
  contentType?: string;
  /** Use default receiver. */
  useDefaultReceiver?: boolean;
  /** Share action ("edit", "send", or "view"). */
  action?: "edit" | "send" | "view";
}
/**
 * Shares content or a file using Android's share intent.
 * Corresponds to `termux-share`.
 * Note: This function initiates a UI interaction (chooser dialog) on the Android device.
 */
export function share(params: ShareParams): Promise<string> {
  const args: string[] = [];
  // term-share bug workaround, spaces in title make it not work
  if (params.title) args.push("-t", params.title.replaceAll(/\s+/g, "-"));
  if (params.contentType) args.push("-c", params.contentType);
  if (params.useDefaultReceiver) args.push("-d");
  if (params.action) args.push("-a", params.action);

  let inputText: string | undefined;
  if (params.filePath) {
    args.push(params.filePath);
  } else if (params.text) {
    inputText = params.text;
  } else {
    return Promise.reject(
      new Error("Either text or filePath must be provided for sharing."),
    );
  }
  return executeTermuxCommand(["share", ...args], inputText, false);
}

// --- SMS Inbox API ---
/**
 * SMS message or conversation entry.
 */
export interface SmsMessage {
  /** Thread ID. */
  threadid: number;
  /** Message type. */
  type: "inbox" | "sent" | "draft" | "failed" | "outbox" | string;
  /** Whether the message is read. */
  read: boolean;
  /** Sender ("You" for sent messages, contact name or number for inbox). */
  sender?: string;
  /** Phone number (recipient or sender). */
  address: string;
  /** Deprecated: same as address. */
  number: string;
  /** Received timestamp ("yyyy-MM-dd HH:mm:ss"). */
  received: string;
  /** Message body. */
  body: string;
  /** Message ID. */
  _id: number;
}
/**
 * Parameters for listing SMS messages or conversations.
 */
export interface GetSmsListParams {
  /** List conversations instead of individual messages. */
  conversationList?: boolean;
  /** For conversationList: if true, return multiple messages per conversation. */
  conversationReturnMultipleMessages?: boolean;
  /** For conversationList: if true, return as nested JSON object keyed by thread_id. */
  conversationReturnNestedView?: boolean;
  /** For conversationList: if true, do not reverse the default sort order. */
  conversationReturnNoOrderReverse?: boolean;
  /** Conversation offset for pagination. */
  conversationOffset?: number;
  /** Conversation limit for pagination. */
  conversationLimit?: number;
  /** SQL WHERE clause for conversations. */
  conversationSelection?: string;
  /** SQL ORDER BY clause for conversations. */
  conversationSortOrder?: string;

  /** Offset for messages (if not conversationList or for messages within conversations). */
  offset?: number;
  /** Limit for messages. */
  limit?: number;
  /** Message type filter. */
  type?: "all" | "inbox" | "sent" | "draft" | "outbox" | "failed";
  /** SQL WHERE clause for messages. */
  messageSelection?: string;
  /** Filter by sender/recipient number. */
  fromAddress?: string;
  /** SQL ORDER BY clause for messages. */
  messageSortOrder?: string;
  /** Do not reverse default sort order for messages. */
  messageReturnNoOrderReverse?: boolean;
}
/**
 * Lists SMS messages or conversations.
 * Corresponds to `termux-sms-list`.
 */
export function getSmsList(
  params?: GetSmsListParams,
): Promise<SmsMessage[] | Record<string, SmsMessage[]>> {
  const args: string[] = [];
  if (params?.conversationList) args.push("--conversation-list");
  if (params?.conversationReturnMultipleMessages) {
    args.push("--conversation-return-multiple-messages");
  }
  if (params?.conversationReturnNestedView) {
    args.push("--conversation-return-nested-view");
  }
  if (params?.conversationReturnNoOrderReverse) {
    args.push("--conversation-return-no-order-reverse");
  }
  if (params?.conversationOffset !== undefined) {
    args.push("--conversation-offset", params.conversationOffset.toString());
  }
  if (params?.conversationLimit !== undefined) {
    args.push("--conversation-limit", params.conversationLimit.toString());
  }
  if (params?.conversationSelection) {
    args.push("--conversation-selection", params.conversationSelection);
  }
  if (params?.conversationSortOrder) {
    args.push("--conversation-sort-order", params.conversationSortOrder);
  }

  if (params?.offset !== undefined) {
    args.push("--offset", params.offset.toString());
  }
  if (params?.limit !== undefined) {
    args.push("--limit", params.limit.toString());
  }
  if (params?.type) {
    // The Java API uses integer constants for types, but the termux-sms-list CLI
    // might accept string names directly or map them internally.
    // We assume the CLI handles the string name as provided in the 'type' parameter.
    args.push("--type", params.type);
  }
  if (params?.messageSelection) {
    args.push("--message-selection", params.messageSelection);
  }
  if (params?.fromAddress) args.push("--from", params.fromAddress);
  if (params?.messageSortOrder) {
    args.push("--message-sort-order", params.messageSortOrder);
  }
  if (params?.messageReturnNoOrderReverse) {
    args.push("--message-return-no-order-reverse");
  }

  return executeTermuxCommand(["sms-list", ...args], undefined, true);
}

// --- SMS Send API ---
/**
 * Parameters for sending an SMS message.
 */
export interface SendSmsParams {
  /** Recipient phone numbers. */
  recipients: string[];
  /** Message body (sent via stdin). */
  message: string;
  /** SIM slot to use (0 for SIM1, 1 for SIM2, etc.). */
  simSlot?: number;
}
/**
 * Sends an SMS message.
 * Corresponds to `termux-sms-send`.
 */
export function sendSms(params: SendSmsParams): Promise<string> {
  const args = ["-n", params.recipients.join(",")];
  if (params.simSlot !== undefined) {
    args.push("-s", params.simSlot.toString());
  }
  return executeTermuxCommand(["sms-send", ...args], params.message, false);
}

// --- Speech To Text API ---
/**
 * Converts speech to text.
 * Corresponds to `termux-speech-to-text`.
 * @returns A ChildProcess. Handle its 'stdout' for recognized text strings (one per line).
 */
export function speechToText(): ChildProcess {
  return streamTermuxCommand(["speech-to-text"]);
}

// --- Telephony API ---
/**
 * Information about a telephony cell.
 */
export interface TelephonyCellInfo {
  /** Cell type. */
  type: "gsm" | "lte" | "cdma" | "wcdma" | "nr" | string;
  /** Whether the cell is registered. */
  registered: boolean;
  /** ASU signal strength. */
  asu: number;
  /** Signal strength in dBm. */
  dbm?: number;
  /** Signal level. */
  level?: number;
  // GSM specific
  /** GSM cell ID. */
  cid?: number;
  /** GSM location area code. */
  lac?: number;
  // LTE specific
  /** LTE cell identity. */
  ci?: number;
  /** LTE physical cell ID. */
  pci?: number;
  /** LTE tracking area code. */
  tac?: number;
  /** LTE timing advance. */
  timing_advance?: number;
  /** LTE RSRP (Android O+). */
  rsrp?: number;
  /** LTE RSRQ (Android O+). */
  rsrq?: number;
  /** LTE RSSI (Android Q+). */
  rssi?: number;
  /** LTE bands (Android R+). */
  bands?: number[];
  // NR specific (5G)
  /** NR cell identity. */
  nci?: number;
  /** NR CSI RSRP. */
  csi_rsrp?: number;
  /** NR CSI RSRQ. */
  csi_rsrq?: number;
  /** NR CSI SINR. */
  csi_sinr?: number;
  /** NR SS RSRP. */
  ss_rsrp?: number;
  /** NR SS RSRQ. */
  ss_rsrq?: number;
  /** NR SS SINR. */
  ss_sinr?: number;
  // CDMA specific
  /** CDMA basestation ID. */
  basestation?: number;
  /** CDMA latitude. */
  latitude?: number;
  /** CDMA longitude. */
  longitude?: number;
  /** CDMA network ID. */
  network?: number;
  /** CDMA system ID. */
  system?: number;
  /** CDMA dBm. */
  cdma_dbm?: number;
  /** CDMA ECIO. */
  cdma_ecio?: number;
  /** CDMA level. */
  cdma_level?: number;
  /** EVDO dBm. */
  evdo_dbm?: number;
  /** EVDO ECIO. */
  evdo_ecio?: number;
  /** EVDO level. */
  evdo_level?: number;
  /** EVDO SNR. */
  evdo_snr?: number;
  // WCDMA specific
  /** WCDMA PSC. */
  psc?: number;
  // Common for GSM, LTE, WCDMA, NR
  /** Mobile country code. */
  mcc?: number | string;
  /** Mobile network code. */
  mnc?: number | string;
}
/**
 * Gets cell information.
 * Corresponds to `termux-telephony-cellinfo`.
 */
export function getTelephonyCellInfo(): Promise<TelephonyCellInfo[]> {
  return executeTermuxCommand(["telephony-cellinfo"], undefined, true);
}

/**
 * Information about the telephony device.
 */
export interface TelephonyDeviceInfo {
  /** Whether data is enabled ("true" or "false", Android O+). */
  data_enabled?: string;
  /** Data activity state. */
  data_activity: "none" | "in" | "out" | "inout" | "dormant" | string;
  /** Data connection state. */
  data_state:
    | "disconnected"
    | "connecting"
    | "connected"
    | "suspended"
    | string;
  /** Device ID (IMEI/MEID, requires privileged permission on Android 10+). */
  device_id: string | null;
  /** Device software version. */
  device_software_version: string | null;
  /** Number of phones. */
  phone_count: number;
  /** Phone type. */
  phone_type: "cdma" | "gsm" | "none" | "sip" | string;
  /** Network operator code. */
  network_operator: string | null;
  /** Network operator name. */
  network_operator_name: string | null;
  /** Network country ISO code. */
  network_country_iso: string | null;
  /** Network type (e.g., "lte", "gsm", "unknown"). */
  network_type: string;
  /** Whether network is roaming. */
  network_roaming: boolean;
  /** SIM country ISO code. */
  sim_country_iso: string | null;
  /** SIM operator code. */
  sim_operator: string | null;
  /** SIM operator name. */
  sim_operator_name: string | null;
  /** SIM serial number (requires privileged permission on Android 10+). */
  sim_serial_number: string | null;
  /** SIM subscriber ID (IMSI, requires privileged permission on Android 10+). */
  sim_subscriber_id: string | null;
  /** SIM state. */
  sim_state:
    | "absent"
    | "network_locked"
    | "pin_required"
    | "puk_required"
    | "ready"
    | "unknown"
    | string;
}
/**
 * Gets telephony device information.
 * Corresponds to `termux-telephony-deviceinfo`.
 */
export function getTelephonyDeviceInfo(): Promise<TelephonyDeviceInfo> {
  return executeTermuxCommand(["telephony-deviceinfo"], undefined, true);
}

/**
 * Initiates a phone call.
 * Corresponds to `termux-telephony-call <number>`.
 */
export function telephonyCall(phoneNumber: string): Promise<string> {
  return executeTermuxCommand(
    ["telephony-call", phoneNumber],
    undefined,
    false,
  );
}

// --- Text To Speech API ---
/**
 * Information about a TTS engine.
 */
export interface TTSEngineInfo {
  /** Engine name. */
  name: string;
  /** Engine label. */
  label: string;
  /** Whether this is the default engine. */
  default: boolean;
}
/**
 * Parameters for speaking text using TTS.
 */
export interface SpeakParams {
  /** Text to speak (sent via stdin). */
  text: string;
  /** Language code (e.g., "en"). */
  language?: string;
  /** Region code (e.g., "US"). */
  region?: string;
  /** Language variant. */
  variant?: string;
  /** TTS engine to use. */
  engine?: string;
  /** Pitch (default 1.0). */
  pitch?: number;
  /** Rate (default 1.0). */
  rate?: number;
  /** Audio stream to use (default MUSIC). */
  stream?:
    | "NOTIFICATION"
    | "ALARM"
    | "MUSIC"
    | "RING"
    | "SYSTEM"
    | "VOICE_CALL";
}
/**
 * Lists available TTS engines.
 * Corresponds to `termux-tts-engines`.
 */
export function listTTSEngines(): Promise<TTSEngineInfo[]> {
  return executeTermuxCommand(["tts-engines"], undefined, true);
}
/**
 * Speaks text using TTS.
 * Corresponds to `termux-tts-speak`.
 */
export function ttsSpeak(params: SpeakParams): Promise<string> {
  const args: string[] = [];
  if (params.language) args.push("-l", params.language);
  if (params.region) args.push("-n", params.region); // -n for region in CLI
  if (params.variant) args.push("-v", params.variant);
  if (params.engine) args.push("-e", params.engine);
  if (params.pitch !== undefined) args.push("-p", params.pitch.toString());
  if (params.rate !== undefined) args.push("-r", params.rate.toString());
  if (params.stream) args.push("-s", params.stream);
  return executeTermuxCommand(["tts-speak", ...args], params.text, false);
}

// --- Toast API ---
/**
 * Parameters for showing a toast message.
 */
export interface ToastParams {
  /** Toast message (sent via stdin). */
  message: string;
  /** Use short duration. */
  shortDuration?: boolean;
  /** Background color (CSS color string). */
  backgroundColor?: string;
  /** Text color. */
  textColor?: string;
  /** Toast gravity ("top", "middle", or "bottom"). */
  gravity?: "top" | "middle" | "bottom";
}
/**
 * Shows a toast message.
 * Corresponds to `termux-toast`.
 */
export function showToast(params: ToastParams): Promise<string> {
  const args: string[] = [];
  if (params.shortDuration) args.push("-s");
  if (params.backgroundColor) args.push("-b", params.backgroundColor);
  if (params.textColor) args.push("-c", params.textColor); // -c for color (text) in CLI
  if (params.gravity) args.push("-g", params.gravity);
  return executeTermuxCommand(["toast", ...args], params.message, false);
}

// --- Torch API ---
/**
 * Toggles the flashlight.
 * Corresponds to `termux-torch <on|off>`.
 * @param enable True to turn on, false to turn off.
 */
export function setTorch(enable: boolean): Promise<string> {
  return executeTermuxCommand(
    ["torch", enable ? "on" : "off"],
    undefined,
    false,
  );
}

// --- USB API ---
/**
 * Lists connected USB devices.
 * Corresponds to `termux-usb -l`.
 * @returns A promise resolving to an array of USB device names (e.g., "/dev/bus/usb/001/002").
 */
export async function listUsbDevices(): Promise<string[]> {
  const output = await executeTermuxCommand(["usb", "-l"], undefined, false);
  // The command outputs one device per line.
  return output.split("\n").map((s: string) => s.trim()).filter((s: string) =>
    s.length > 0
  );
}

/**
 * Requests permission for a USB device.
 * Corresponds to `termux-usb -r <device_path>`.
 * @param devicePath The path of the USB device (e.g., "/dev/bus/usb/001/002").
 * @returns A promise resolving to a string indicating permission status.
 */
export function requestUsbPermission(
  devicePath: string,
): Promise<string> {
  return executeTermuxCommand(["usb", "-r", devicePath], undefined, false);
}
// Note: `termux-usb -o <device>` to open a device and get an FD is not wrapped
// because managing FDs from a separate Node.js process is complex and platform-specific.

// --- Vibrate API ---
/**
 * Parameters for vibrating the device.
 */
export interface VibrateParams {
  /** Duration in milliseconds (default 1000). */
  durationMs?: number;
  /** Vibrate even in silent mode. */
  force?: boolean;
}
/**
 * Vibrates the device.
 * Corresponds to `termux-vibrate`.
 */
export function vibrate(params?: VibrateParams): Promise<string> {
  const args: string[] = [];
  if (params?.durationMs !== undefined) {
    args.push("-d", params.durationMs.toString());
  }
  if (params?.durationMs !== undefined) {
    args.push("-d", params.durationMs.toString());
  }
  if (params?.force) args.push("-f");
  return executeTermuxCommand(["vibrate", ...args], undefined, false);
}

// --- Volume API ---
/**
 * Audio stream type.
 */
export type AudioStreamType =
  | "alarm"
  | "music"
  | "notification"
  | "ring"
  | "system"
  | "call";

/**
 * Information about an audio stream's volume.
 */
export interface StreamVolumeInfo {
  /** Stream type. */
  stream: AudioStreamType | string;
  /** Current volume. */
  volume: number;
  /** Maximum volume. */
  max_volume: number;
}
/**
 * Gets volume information for all audio streams.
 * Corresponds to `termux-volume`.
 */
export function getVolumeInfo(): Promise<StreamVolumeInfo[]> {
  return executeTermuxCommand(["volume"], undefined, true);
}

/**
 * Parameters for setting audio stream volume.
 */
export interface SetVolumeParams {
  /** Stream type. */
  stream: AudioStreamType;
  /** Volume level. */
  volume: number;
}
/**
 * Sets the volume for a specific audio stream.
 * Corresponds to `termux-volume -s <stream> -v <volume>`.
 */
export function setVolume(params: SetVolumeParams): Promise<string> {
  return executeTermuxCommand(
    ["volume", "-s", params.stream, "-v", params.volume.toString()],
    undefined,
    false,
  );
}

// --- Wallpaper API ---
/**
 * Parameters for setting the device wallpaper.
 */
export interface WallpaperParams {
  /** Absolute path to an image file. */
  filePath?: string;
  /** URL of an image. */
  url?: string;
  /** Set for lockscreen instead of system wallpaper. */
  setForLockscreen?: boolean;
}
/**
 * Sets the device wallpaper.
 * Corresponds to `termux-wallpaper`.
 * @returns A string containing the output message (success or error).
 */
export function setWallpaper(params: WallpaperParams): Promise<string> {
  const args: string[] = [];
  if (params.filePath) {
    args.push("-f", params.filePath);
  } else if (params.url) {
    args.push("-u", params.url);
  } else {
    return Promise.reject(
      new Error("Either filePath or url must be provided for wallpaper."),
    );
  }
  if (params.setForLockscreen) args.push("-l");
  return executeTermuxCommand(["wallpaper", ...args], undefined, false);
}

// --- Wifi API ---
/**
 * Information about the current Wi-Fi connection.
 */
export interface WifiConnectionInfo {
  /** BSSID of the connected access point. */
  bssid: string;
  /** Frequency in MHz. */
  frequency_mhz: number;
  /** Device IP address. */
  ip: string;
  /** Link speed in Mbps. */
  link_speed_mbps: number;
  /** MAC address. */
  mac_address: string;
  /** Network ID. */
  network_id: number;
  /** Signal strength (RSSI) in dBm. */
  rssi: number;
  /** SSID of the connected network. */
  ssid: string;
  /** Whether the SSID is hidden. */
  ssid_hidden: boolean;
  /** Supplicant state. */
  supplicant_state: string;
  /** API error message, if any. */
  API_ERROR?: string;
}
/**
 * Gets current Wi-Fi connection information.
 * Corresponds to `termux-wifi-connectioninfo`.
 */
export function getWifiConnectionInfo(): Promise<WifiConnectionInfo> {
  return executeTermuxCommand(["wifi-connectioninfo"], undefined, true);
}

/**
 * Result of a Wi-Fi scan.
 */
export interface WifiScanResult {
  /** BSSID of the access point. */
  bssid: string;
  /** Frequency in MHz. */
  frequency_mhz: number;
  /** Signal strength in dBm. */
  rssi: number;
  /** SSID of the network. */
  ssid: string;
  /** Timestamp (ms since boot) when this result was last seen. */
  timestamp: number;
  /** Channel bandwidth in MHz. */
  channel_bandwidth_mhz: "20" | "40" | "80" | "80+80" | "160" | "???";
  /** Center frequency in MHz (if bandwidth > 20MHz). */
  center_frequency_mhz?: number;
  /** Capabilities string. */
  capabilities?: string;
  /** Operator name. */
  operator_name?: string;
  /** Venue name. */
  venue_name?: string;
}
/**
 * Gets Wi-Fi scan results. Location services might need to be enabled.
 * Corresponds to `termux-wifi-scaninfo`.
 */
export function getWifiScanInfo(): Promise<
  WifiScanResult[] | { API_ERROR: string }
> {
  return executeTermuxCommand(["wifi-scaninfo"], undefined, true);
}

/**
 * Enables or disables Wi-Fi.
 * Corresponds to `termux-wifi-enable <true|false>`.
 */
export function setWifiEnabled(enable: boolean): Promise<string> {
  return executeTermuxCommand(
    ["wifi-enable", enable.toString()],
    undefined,
    false,
  );
}
