import { ChildProcess, spawn } from "node:child_process";

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
export interface AudioInfo {
  PROPERTY_OUTPUT_SAMPLE_RATE: string;
  PROPERTY_OUTPUT_FRAMES_PER_BUFFER: string;
  AUDIOTRACK_SAMPLE_RATE: number;
  AUDIOTRACK_BUFFER_SIZE_IN_FRAMES: number;
  AUDIOTRACK_SAMPLE_RATE_LOW_LATENCY?: number;
  AUDIOTRACK_BUFFER_SIZE_IN_FRAMES_LOW_LATENCY?: number;
  AUDIOTRACK_SAMPLE_RATE_POWER_SAVING?: number;
  AUDIOTRACK_BUFFER_SIZE_IN_FRAMES_POWER_SAVING?: number;
  BLUETOOTH_A2DP_IS_ON: boolean;
  WIREDHEADSET_IS_CONNECTED: boolean;
}
/**
 * Gets audio information from the device.
 * Corresponds to `termux-audio-info`.
 */
export function getAudioInfo(): Promise<AudioInfo> {
  return executeTermuxCommand(["audio-info"], undefined, true);
}

// --- Battery Status API ---
export interface BatteryStatus {
  present: boolean;
  technology: string;
  health:
    | "COLD"
    | "DEAD"
    | "GOOD"
    | "OVERHEAT"
    | "OVER_VOLTAGE"
    | "UNKNOWN"
    | "UNSPECIFIED_FAILURE"
    | string;
  plugged:
    | "UNPLUGGED"
    | "PLUGGED_AC"
    | "PLUGGED_DOCK"
    | "PLUGGED_USB"
    | "PLUGGED_WIRELESS"
    | string;
  status: "CHARGING" | "DISCHARGING" | "FULL" | "NOT_CHARGING" | "UNKNOWN";
  temperature: number; // Celsius
  voltage: number; // mV
  current: number; // microamperes
  current_average: number | null;
  percentage: number | null; // Modern way to get percentage
  level: number; // Older way, use with scale
  scale: number; // Older way, use with level
  charge_counter: number | null; // microampere-hours
  energy: number | null; // nanowatt-hours
  cycle?: number | null; // Battery cycle count (Android U+)
}
/**
 * Gets the battery status of the device.
 * Corresponds to `termux-battery-status`.
 */
export function getBatteryStatus(): Promise<BatteryStatus> {
  return executeTermuxCommand(["battery-status"], undefined, true);
}

// --- Brightness API ---
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
export interface CallLogEntry {
  name: string; // "UNKNOWN_CALLER" if not found
  phone_number: string;
  type:
    | "BLOCKED"
    | "INCOMING"
    | "MISSED"
    | "OUTGOING"
    | "REJECTED"
    | "VOICEMAIL"
    | "UNKNOWN_TYPE";
  date: string; // "yyyy-MM-dd HH:mm:ss"
  duration: string; // "HH:mm:ss" or "mm:ss"
  sim_id: string | null;
}
export interface GetCallLogParams {
  limit?: number;
  offset?: number;
}
/**
 * Gets the call log.
 * Corresponds to `termux-call-log`.
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
export interface CameraOutputSize {
  width: number;
  height: number;
}
export interface CameraPhysicalSize {
  width: number;
  height: number;
}
export interface CameraInfo {
  id: string;
  facing: "front" | "back" | number;
  jpeg_output_sizes: CameraOutputSize[];
  focal_lengths: number[];
  auto_exposure_modes: string[]; // e.g., "CONTROL_AE_MODE_OFF", "CONTROL_AE_MODE_ON"
  physical_size: CameraPhysicalSize;
  capabilities: string[]; // e.g., "backward_compatible", "burst_capture"
}
/**
 * Gets information about available cameras.
 * Corresponds to `termux-camera-info`.
 */
export function getCameraInfo(): Promise<CameraInfo[]> {
  return executeTermuxCommand(["camera-info"], undefined, true);
}

// --- Camera Photo API ---
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
export interface Contact {
  name: string;
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

export interface DialogResultBase {
  code: number; // -1 for OK, -2 for Cancel, -3 for Neutral
  text?: string; // For text, counter, date, time, spinner, radio (selected text), speech
  error?: string;
}

export interface DialogConfirmResult extends DialogResultBase {
  text: "yes" | "no"; // For confirm
}

export interface DialogCheckboxValue {
  index: number;
  text: string;
}
export interface DialogCheckboxResult extends DialogResultBase {
  values?: DialogCheckboxValue[]; // For checkbox
}

export interface DialogRadioResult extends DialogResultBase {
  index?: number; // For radio, spinner, sheet
}

export interface DialogSheetResult extends DialogResultBase {
  index?: number;
  text?: string; // Selected item text
}

export type DialogResult =
  | DialogConfirmResult
  | DialogCheckboxResult
  | DialogRadioResult
  | DialogSheetResult
  | DialogResultBase;

export interface DialogBaseParams {
  title?: string;
  hint?: string; // For text, counter, date, time, speech, confirm
}

export interface DialogTextParams extends DialogBaseParams {
  inputType?: "text" | "number" | "password" | "numberPassword";
  multipleLines?: boolean;
}

export interface DialogCounterParams extends DialogBaseParams {
  min?: number;
  max?: number;
  start?: number;
}

export interface DialogDateParams extends DialogBaseParams {
  format?: string; // Java SimpleDateFormat
}

export interface DialogWithOptionsParams extends DialogBaseParams {
  values: string[]; // For checkbox, radio, spinner, sheet
}

/**
 * Shows a dialog. This is a simplified wrapper.
 * For full control, you might need to call `termux-dialog` with specific subcommands.
 * Corresponds to `termux-dialog`.
 * Note: This function initiates a UI interaction on the Android device.
 */
export async function showDialog(
  type: "confirm",
  params: DialogBaseParams,
): Promise<DialogConfirmResult>;
export async function showDialog(
  type: "text",
  params: DialogTextParams,
): Promise<DialogResultBase>;
export async function showDialog(
  type: "counter",
  params: DialogCounterParams,
): Promise<DialogResultBase>;
export async function showDialog(
  type: "date",
  params: DialogDateParams,
): Promise<DialogResultBase>;
export async function showDialog(
  type: "time",
  params: DialogBaseParams,
): Promise<DialogResultBase>;
export async function showDialog(
  type: "checkbox" | "radio" | "spinner" | "sheet",
  params: DialogWithOptionsParams,
): Promise<DialogCheckboxResult | DialogRadioResult | DialogSheetResult>;
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
export interface DownloadParams {
  url: string;
  title?: string;
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
export interface FingerprintParams {
  title?: string;
  description?: string;
  subtitle?: string;
  cancelButtonText?: string; // Maps to "cancel" extra
}
export interface FingerprintResult {
  errors: string[];
  failed_attempts: number;
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
export interface InfraredFrequencyRange {
  min: number;
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

export interface TransmitInfraredParams {
  frequency: number;
  pattern: number[]; // Durations in microseconds
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
export interface ScheduleJobParams {
  scriptPath: string;
  jobId?: number;
  periodMs?: number; // Minimum 15 minutes (900000ms) for Android N+
  networkType?: "any" | "unmetered" | "cellular" | "not_roaming" | "none";
  batteryNotLow?: boolean; // Default true
  charging?: boolean;
  persisted?: boolean; // Job persists across reboots
  idle?: boolean;
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

export interface CancelJobParams {
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
export interface LocationInfo {
  latitude: number;
  longitude: number;
  altitude: number;
  accuracy: number; // meters
  vertical_accuracy?: number; // meters (Android O+)
  bearing: number; // degrees
  speed: number; // meters/second
  elapsedMs: number; // milliseconds since boot for this location fix
  provider: "gps" | "network" | "passive" | string;
  API_ERROR?: string;
}
export interface GetLocationParams {
  provider?: "gps" | "network" | "passive";
  requestType?: "last" | "once" | "updates"; // "updates" will stream, not suitable for this helper
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
export type MediaPlayerAction = "play" | "pause" | "resume" | "stop" | "info";
export interface MediaPlayerCommandParams {
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
export interface MediaScanParams {
  paths: string[];
  recursive?: boolean;
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
export type MicRecorderAction = "info" | "record" | "quit";
export interface MicRecorderRecordParams {
  filePath?: string; // Default: TermuxAudioRecording_yyyy-MM-dd_HH-mm-ss.<ext>
  limitSeconds?: number; // 0 or negative for unlimited
  encoder?: "aac" | "amr_nb" | "amr_wb" | "opus"; // Default: aac
  // format, source, bitrate, srate, channels are also available but more advanced
}
export interface MicRecorderInfo {
  isRecording: boolean;
  outputFile?: string;
}
/**
 * Controls microphone recording.
 * Corresponds to `termux-microphone-record`.
 */
export async function micRecord(action: "info"): Promise<MicRecorderInfo>;
export async function micRecord(
  action: "record",
  params?: MicRecorderRecordParams,
): Promise<string>;
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
export type NfcReadMode = "short" | "full";
export interface NfcReadParams {
  mode?: NfcReadMode; // Default is 'short' if not specified by CLI
  // timeout?: number; // CLI might have a timeout option
}
export interface NfcWriteParams {
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
export type NotificationPriority = "default" | "high" | "low" | "max" | "min";
export interface NotificationButton {
  text: string;
  /** Action string, can include $REPLY for reply buttons. */
  action: string;
}
export interface NotificationParams {
  content: string; // Sent via stdin
  title?: string;
  id?: string;
  priority?: NotificationPriority;
  ledColor?: string; // ARGB hex, e.g., "FF00FF00" for green
  ledOnMs?: number;
  ledOffMs?: number;
  vibratePattern?: number[]; // e.g., [500, 1000, 200]
  sound?: boolean; // Use default notification sound
  ongoing?: boolean;
  alertOnce?: boolean;
  action?: string; // Script to run on click
  groupKey?: string;
  channelId?: string; // Default: "termux-notification"
  iconName?: string; // e.g., "alarm_on" (maps to R.drawable.ic_alarm_on_black_24dp)
  imagePath?: string; // Absolute path to an image file
  type?: "media"; // For media style notification
  mediaPreviousAction?: string;
  mediaPauseAction?: string;
  mediaPlayAction?: string;
  mediaNextAction?: string;
  buttons?: NotificationButton[]; // Max 3 buttons
  onDeleteAction?: string; // Script to run on dismissal
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

export interface NotificationChannelParams {
  id: string;
  name: string;
  priority?: NotificationPriority; // default, high, low, max, min
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
export interface NotificationEntry {
  id: number;
  tag: string | null;
  key: string;
  group: string | null;
  packageName: string;
  title: string;
  content: string;
  when: string; // "yyyy-MM-dd HH:mm:ss"
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
export interface SensorList {
  sensors: string[];
}
export interface SensorReadout {
  [sensorName: string]: {
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
export interface ShareParams {
  /** Text content to share (if filePath is not provided). */
  text?: string;
  /** Absolute path to a file to share. */
  filePath?: string;
  title?: string;
  contentType?: string; // MIME type
  useDefaultReceiver?: boolean;
  action?: "edit" | "send" | "view"; // Default: view
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
export interface SmsMessage {
  threadid: number;
  type: "inbox" | "sent" | "draft" | "failed" | "outbox" | string;
  read: boolean;
  sender?: string; // "You" for sent messages, contact name or number for inbox
  address: string; // Phone number
  number: string; // Deprecated, same as address
  received: string; // "yyyy-MM-dd HH:mm:ss"
  body: string;
  _id: number;
}
export interface GetSmsListParams {
  /** List conversations instead of individual messages. */
  conversationList?: boolean;
  /** For conversationList: if true, return multiple messages per conversation. */
  conversationReturnMultipleMessages?: boolean;
  /** For conversationList: if true, return as nested JSON object keyed by thread_id. */
  conversationReturnNestedView?: boolean;
  /** For conversationList: if true, do not reverse the default sort order. */
  conversationReturnNoOrderReverse?: boolean;
  conversationOffset?: number;
  conversationLimit?: number;
  conversationSelection?: string; // SQL WHERE clause
  conversationSortOrder?: string; // SQL ORDER BY clause

  /** Offset for messages (if not conversationList or for messages within conversations). */
  offset?: number;
  /** Limit for messages. */
  limit?: number;
  /** Message type filter: "inbox", "sent", "draft", etc. (integer value for API). */
  type?: "all" | "inbox" | "sent" | "draft" | "outbox" | "failed"; // Maps to TextBasedSmsColumns
  messageSelection?: string; // SQL WHERE clause for messages
  fromAddress?: string; // Filter by sender/recipient number
  messageSortOrder?: string; // SQL ORDER BY clause for messages
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
export interface SendSmsParams {
  recipients: string[];
  message: string; // Sent via stdin
  simSlot?: number; // 0 for SIM1, 1 for SIM2, etc.
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
export interface TelephonyCellInfo {
  type: "gsm" | "lte" | "cdma" | "wcdma" | "nr" | string;
  registered: boolean;
  asu: number;
  dbm?: number;
  level?: number;
  // GSM specific
  cid?: number;
  lac?: number;
  // LTE specific
  ci?: number;
  pci?: number;
  tac?: number;
  timing_advance?: number;
  rsrp?: number; // (Android O+)
  rsrq?: number; // (Android O+)
  rssi?: number; // (Android Q+)
  bands?: number[]; // (Android R+)
  // NR specific (5G)
  nci?: number;
  csi_rsrp?: number;
  csi_rsrq?: number;
  csi_sinr?: number;
  ss_rsrp?: number;
  ss_rsrq?: number;
  ss_sinr?: number;
  // CDMA specific
  basestation?: number;
  latitude?: number;
  longitude?: number;
  network?: number;
  system?: number;
  cdma_dbm?: number;
  cdma_ecio?: number;
  cdma_level?: number;
  evdo_dbm?: number;
  evdo_ecio?: number;
  evdo_level?: number;
  evdo_snr?: number;
  // WCDMA specific
  psc?: number;
  // Common for GSM, LTE, WCDMA, NR
  mcc?: number | string;
  mnc?: number | string;
}
/**
 * Gets cell information.
 * Corresponds to `termux-telephony-cellinfo`.
 */
export function getTelephonyCellInfo(): Promise<TelephonyCellInfo[]> {
  return executeTermuxCommand(["telephony-cellinfo"], undefined, true);
}

export interface TelephonyDeviceInfo {
  data_enabled?: string; // "true" or "false" (Android O+)
  data_activity: "none" | "in" | "out" | "inout" | "dormant" | string;
  data_state:
    | "disconnected"
    | "connecting"
    | "connected"
    | "suspended"
    | string;
  device_id: string | null; // IMEI/MEID, requires READ_PRIVILEGED_PHONE_STATE on Android 10+
  device_software_version: string | null;
  phone_count: number;
  phone_type: "cdma" | "gsm" | "none" | "sip" | string;
  network_operator: string | null;
  network_operator_name: string | null;
  network_country_iso: string | null;
  network_type: string; // e.g., "lte", "gsm", "unknown"
  network_roaming: boolean;
  sim_country_iso: string | null;
  sim_operator: string | null;
  sim_operator_name: string | null;
  sim_serial_number: string | null; // Requires READ_PRIVILEGED_PHONE_STATE on Android 10+
  sim_subscriber_id: string | null; // IMSI, requires READ_PRIVILEGED_PHONE_STATE on Android 10+
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
export interface TTSEngineInfo {
  name: string;
  label: string;
  default: boolean;
}
export interface SpeakParams {
  text: string; // Sent via stdin
  language?: string; // e.g., "en"
  region?: string; // e.g., "US"
  variant?: string;
  engine?: string;
  pitch?: number; // Default 1.0
  rate?: number; // Default 1.0
  stream?:
    | "NOTIFICATION"
    | "ALARM"
    | "MUSIC"
    | "RING"
    | "SYSTEM"
    | "VOICE_CALL"; // Default MUSIC
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
export interface ToastParams {
  message: string; // Sent via stdin
  shortDuration?: boolean; // -s flag
  backgroundColor?: string; // CSS color, e.g., "#FF0000" or "red"
  textColor?: string;
  gravity?: "top" | "middle" | "bottom"; // Default: middle (center)
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
export interface VibrateParams {
  durationMs?: number; // Default 1000
  force?: boolean; // Vibrate even in silent mode
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
export type AudioStreamType =
  | "alarm"
  | "music"
  | "notification"
  | "ring"
  | "system"
  | "call";
export interface StreamVolumeInfo {
  stream: AudioStreamType | string;
  volume: number;
  max_volume: number;
}
/**
 * Gets volume information for all audio streams.
 * Corresponds to `termux-volume`.
 */
export function getVolumeInfo(): Promise<StreamVolumeInfo[]> {
  return executeTermuxCommand(["volume"], undefined, true);
}

export interface SetVolumeParams {
  stream: AudioStreamType;
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
export interface WifiConnectionInfo {
  bssid: string;
  frequency_mhz: number;
  ip: string;
  link_speed_mbps: number;
  mac_address: string;
  network_id: number;
  rssi: number;
  ssid: string;
  ssid_hidden: boolean;
  supplicant_state: string;
  API_ERROR?: string;
}
/**
 * Gets current Wi-Fi connection information.
 * Corresponds to `termux-wifi-connectioninfo`.
 */
export function getWifiConnectionInfo(): Promise<WifiConnectionInfo> {
  return executeTermuxCommand(["wifi-connectioninfo"], undefined, true);
}

export interface WifiScanResult {
  bssid: string;
  frequency_mhz: number;
  rssi: number; // Signal strength in dBm
  ssid: string;
  timestamp: number; // Milliseconds since boot when this result was last seen
  channel_bandwidth_mhz: "20" | "40" | "80" | "80+80" | "160" | "???";
  center_frequency_mhz?: number; // Only if bandwidth > 20MHz
  capabilities?: string;
  operator_name?: string;
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

// Example Usage (commented out, for illustration)
/*
async function main() {
    try {
        const battery = await TermuxAPI.getBatteryStatus();
        console.log("Battery Percentage:", battery.percentage ?? (battery.level / battery.scale * 100));

        await TermuxAPI.showToast({ message: "Hello from Node.js!", shortDuration: true });

        const contacts = await TermuxAPI.getContactList();
        if (contacts.length > 0) {
            console.log("First contact:", contacts[0].name);
        }

        // Stream sensor data
        // const sensorProcess = TermuxAPI.streamSensorData({ sensors: "accelerometer", limit: 5 });
        // sensorProcess.stdout?.on('data', (data) => {
        //     try {
        //         const sensorData: TermuxAPI.SensorReadout = JSON.parse(data.toString());
        //         console.log("Accelerometer:", sensorData.ACCELEROMETER?.values);
        //     } catch (e) {
        //         console.error("Failed to parse sensor data:", data.toString());
        //     }
        // });
        // sensorProcess.stderr?.on('data', (data) => console.error("Sensor error:", data.toString()));
        // sensorProcess.on('close', (code) => console.log("Sensor stream closed with code:", code));

    } catch (error) {
        console.error("Termux API call failed:", error);
    }
}

main();
*/
