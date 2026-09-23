import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolve } from "node:path";
import { assessTelemetry } from "../src/model-core.mjs";

const root = resolve(import.meta.dirname, "..");
const risk = JSON.parse(readFileSync(resolve(root, "models", "risk_model.json"), "utf8"));
const anomaly = JSON.parse(readFileSync(resolve(root, "models", "anomaly_model.json"), "utf8"));

const normal = { temperature_c: 58, vibration_mm_s: 2.1, motor_current_a: 36, hydraulic_pressure_bar: 168, coolant_flow_l_min: 14.8, production_rate_units_h: 74 };
const bearing = { temperature_c: 74.1, vibration_mm_s: 8.6, motor_current_a: 46.2, hydraulic_pressure_bar: 176, coolant_flow_l_min: 14.6, production_rate_units_h: 68 };

test("bearing-like telemetry is riskier than a normal reference", () => {
  const healthy = assessTelemetry(normal, risk, anomaly);
  const degraded = assessTelemetry(bearing, risk, anomaly);
  assert.ok(degraded.risk_probability > healthy.risk_probability);
  assert.ok(degraded.anomaly_percent >= healthy.anomaly_percent);
  assert.equal(degraded.risk_band, "high");
});

test("incomplete telemetry is rejected instead of silently scored", () => {
  assert.throws(() => assessTelemetry({ temperature_c: 70 }, risk, anomaly), /Missing or invalid/);
});


