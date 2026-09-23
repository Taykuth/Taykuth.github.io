/** Shared, dependency-free inference helpers for browser-compatible model artifacts. */
export const FEATURES = [
  "temperature_c",
  "vibration_mm_s",
  "motor_current_a",
  "hydraulic_pressure_bar",
  "coolant_flow_l_min",
  "production_rate_units_h",
];

export const sigmoid = (value) => value >= 0 ? 1 / (1 + Math.exp(-value)) : Math.exp(value) / (1 + Math.exp(value));

export function normalize(reading, scaler, features = FEATURES) {
  return features.map((feature) => (Number(reading[feature]) - scaler.means[feature]) / scaler.stdevs[feature]);
}

export function riskProbability(reading, riskArtifact) {
  const input = [1, ...normalize(reading, riskArtifact.scaler, riskArtifact.features)];
  const linear = input.reduce((total, value, index) => total + value * riskArtifact.logistic.weights[index], 0);
  return sigmoid(linear);
}

export function anomalyRaw(reading, anomalyArtifact) {
  const z = normalize(reading, anomalyArtifact.scaler, anomalyArtifact.features).map(Math.abs);
  return z.reduce((total, value) => total + Math.min(value, 6), 0) / z.length;
}

export function anomalyPercent(reading, anomalyArtifact) {
  const raw = anomalyRaw(reading, anomalyArtifact);
  const { low, high } = anomalyArtifact.anomalyBounds;
  return Math.round(100 * Math.min(Math.max((raw - low) / (high - low + 1e-9), 0), 1));
}

export function strongestDrivers(reading, anomalyArtifact, limit = 2) {
  return anomalyArtifact.features
    .map((feature) => ({
      feature,
      z: Math.abs((Number(reading[feature]) - anomalyArtifact.scaler.means[feature]) / anomalyArtifact.scaler.stdevs[feature]),
    }))
    .sort((a, b) => b.z - a.z)
    .slice(0, limit);
}

export function assessTelemetry(reading, riskArtifact, anomalyArtifact) {
  const missing = FEATURES.filter((feature) => !Number.isFinite(Number(reading[feature])));
  if (missing.length) throw new Error(`Missing or invalid numeric features: ${missing.join(", ")}`);
  const probability = riskProbability(reading, riskArtifact);
  const riskPercent = Math.round(probability * 100);
  return {
    risk_probability: Number(probability.toFixed(6)),
    risk_percent: riskPercent,
    anomaly_percent: anomalyPercent(reading, anomalyArtifact),
    risk_band: riskPercent >= 70 ? "high" : riskPercent >= 40 ? "medium" : "low",
    drivers: strongestDrivers(reading, anomalyArtifact),
  };
}


