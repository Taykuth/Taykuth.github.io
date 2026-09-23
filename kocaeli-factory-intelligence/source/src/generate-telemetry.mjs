/**
 * Reproducible factory telemetry generator for the KFI portfolio project.
 * Data is synthetic by design; fault patterns are controlled so model
 * evaluation has an auditable ground truth.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "data", "telemetry.csv");

let state = 20260923;
function random() {
  state = (1664525 * state + 1013904223) >>> 0;
  return state / 4294967296;
}
function normal(mean = 0, stdev = 1) {
  const u = Math.max(random(), Number.EPSILON);
  const v = random();
  return mean + stdev * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const clamp = (value, min, max = Infinity) => Math.min(Math.max(value, min), max);
const round = (value, digits = 2) => Number(value.toFixed(digits));

const machines = [
  ["PRES-04", "Pres Makinesi 04", "Metal şekillendirme", 58, 2.0, 36, 168],
  ["CNC-12", "CNC İşleme 12", "Talaşlı imalat", 62, 1.7, 31, 152],
  ["INJ-07", "Enjeksiyon Presi 07", "Plastik parça", 60, 1.4, 28, 160],
  ["ROB-03", "Kaynak Robotu 03", "Otomotiv hattı", 49, 1.2, 23, 108],
  ["PRES-09", "Pres Makinesi 09", "Metal şekillendirme", 56, 1.8, 34, 166],
  ["CNC-03", "CNC İşleme 03", "Talaşlı imalat", 60, 1.5, 30, 149],
  ["INJ-11", "Enjeksiyon Presi 11", "Plastik parça", 59, 1.5, 27, 158],
  ["ROB-08", "Kaynak Robotu 08", "Otomotiv hattı", 47, 1.1, 22, 105],
];

function incidentsFor(machineOffset, length) {
  return [
    [110 + machineOffset * 3, 146 + machineOffset * 3, "bearing"],
    [294 + machineOffset * 2, 336 + machineOffset * 2, "cooling"],
    [454 + machineOffset, Math.min(488 + machineOffset, length - 5), "bearing"],
  ];
}

function generateMachine(machine, offset, start) {
  const [machineId, machineName, process, baseTemp, baseVibration, baseCurrent, basePressure] = machine;
  const length = 576;
  const rows = [];
  const incidents = incidentsFor(offset, length);
  for (let tick = 0; tick < length; tick += 1) {
    const date = new Date(start.getTime() + tick * 15 * 60 * 1000);
    const cycle = 0.8 * Math.sin((2 * Math.PI * tick) / 96) + 0.35 * Math.sin((2 * Math.PI * tick) / 32);
    let production = 74 + 9 * Math.max(cycle, -0.3) + normal(0, 2.8);
    let temperature = baseTemp + 1.7 * cycle + normal(0, 0.75);
    let vibration = baseVibration + 0.2 * Math.max(cycle, 0) + normal(0, 0.09);
    let motorCurrent = baseCurrent + 1.2 * cycle + normal(0, 0.7);
    let pressure = basePressure + 2.1 * cycle + normal(0, 1.2);
    let coolantFlow = 14.8 + normal(0, 0.45);
    let failureEvent = 0;
    let failureType = "none";
    let failureWithin24h = 0;

    for (const [startTick, eventTick, type] of incidents) {
      if (tick >= Math.max(0, eventTick - 96) && tick < eventTick) failureWithin24h = 1;
      if (tick < startTick || tick > eventTick) continue;
      const progress = (tick - startTick) / Math.max(eventTick - startTick, 1);
      if (type === "bearing") {
        vibration += 5.4 * progress ** 1.5;
        motorCurrent += 9.0 * progress ** 1.25;
        temperature += 7.2 * progress ** 1.1;
        pressure -= 5.5 * progress;
      } else {
        temperature += 19.0 * progress ** 1.2;
        coolantFlow -= 6.5 * progress ** 1.3;
        motorCurrent += 3.4 * progress;
        production -= 13.5 * progress;
      }
      if (tick === eventTick) {
        failureEvent = 1;
        failureType = type;
      }
    }
    rows.push({
      timestamp: date.toISOString(), machine_id: machineId, machine_name: machineName, process,
      temperature_c: round(temperature), vibration_mm_s: round(clamp(vibration, 0.2), 3),
      motor_current_a: round(clamp(motorCurrent, 1)), hydraulic_pressure_bar: round(clamp(pressure, 30)),
      coolant_flow_l_min: round(clamp(coolantFlow, 1)), production_rate_units_h: round(clamp(production, 10)),
      failure_event: failureEvent, failure_type: failureType, failure_within_24h: failureWithin24h,
    });
  }
  return rows;
}

const start = new Date("2026-09-01T00:00:00.000Z");
const telemetry = machines.flatMap((machine, index) => generateMachine(machine, index, start));
telemetry.sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.machine_id.localeCompare(b.machine_id));
const headers = Object.keys(telemetry[0]);
const csv = [headers.join(","), ...telemetry.map((row) => headers.map((header) => row[header]).join(","))].join("\n");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, csv, "utf8");
console.log(`Saved ${telemetry.length.toLocaleString("tr-TR")} telemetry rows to ${output}`);
console.log(`Failure events: ${telemetry.filter((row) => row.failure_event === 1).length}`);
console.log(`24h positive windows: ${telemetry.filter((row) => row.failure_within_24h === 1).length}`);


