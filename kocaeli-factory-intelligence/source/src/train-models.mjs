/**
 * Dependency-free anomaly and predictive-risk training pipeline.
 * Uses z-score anomaly scoring and weighted logistic regression. The goal is
 * not to claim a production-perfect model; it is to make the model, data and
 * metrics inspectable and runnable on any standard Node.js installation.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FEATURES, anomalyPercent, anomalyRaw, normalize, riskProbability, sigmoid } from "./model-core.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = resolve(root, "data", "telemetry.csv");
const reportPath = resolve(root, "reports", "model_report.json");
const dashboardPath = resolve(root, "dist", "data", "model_report.json");
const anomalyModelPath = resolve(root, "models", "anomaly_model.json");
const riskModelPath = resolve(root, "models", "risk_model.json");
const dashboardRiskModelPath = resolve(root, "dist", "data", "risk_model.json");
const dashboardAnomalyModelPath = resolve(root, "dist", "data", "anomaly_model.json");

function parseCsv(text) {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const keys = header.split(",");
  return lines.map((line) => {
    const fields = line.split(",");
    const row = Object.fromEntries(keys.map((key, index) => [key, fields[index]]));
    for (const key of [...FEATURES, "failure_event", "failure_within_24h"]) row[key] = Number(row[key]);
    return row;
  });
}
const mean = (values) => values.reduce((total, value) => total + value, 0) / values.length;
const deviation = (values, average) => Math.sqrt(mean(values.map((value) => (value - average) ** 2))) || 1;
const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)))];
};

function trainLogistic(rows, scaler) {
  const positives = rows.filter((row) => row.failure_within_24h === 1).length;
  const negatives = rows.length - positives;
  const positiveWeight = negatives / Math.max(positives, 1);
  const weights = new Array(FEATURES.length + 1).fill(0);
  const rate = 0.075;
  for (let iteration = 0; iteration < 1400; iteration += 1) {
    const gradient = new Array(weights.length).fill(0);
    for (const row of rows) {
      const input = [1, ...normalize(row, scaler, FEATURES)];
      const prediction = sigmoid(input.reduce((total, value, index) => total + value * weights[index], 0));
      const error = prediction - row.failure_within_24h;
      const sampleWeight = row.failure_within_24h ? positiveWeight : 1;
      for (let index = 0; index < weights.length; index += 1) gradient[index] += error * input[index] * sampleWeight;
    }
    for (let index = 0; index < weights.length; index += 1) {
      const penalty = index === 0 ? 0 : 0.003 * weights[index];
      weights[index] -= rate * (gradient[index] / rows.length + penalty);
    }
  }
  return { weights, positiveWeight };
}
function classificationMetrics(rows) {
  const tp = rows.filter((row) => row.label === 1 && row.prediction === 1).length;
  const fp = rows.filter((row) => row.label === 0 && row.prediction === 1).length;
  const fn = rows.filter((row) => row.label === 1 && row.prediction === 0).length;
  const tn = rows.filter((row) => row.label === 0 && row.prediction === 0).length;
  const precision = tp / Math.max(tp + fp, 1);
  const recall = tp / Math.max(tp + fn, 1);
  return {
    test_rows: rows.length,
    positive_rate: Number(mean(rows.map((row) => row.label)).toFixed(3)),
    precision: Number(precision.toFixed(3)), recall: Number(recall.toFixed(3)),
    f1: Number((2 * precision * recall / Math.max(precision + recall, 1e-9)).toFixed(3)),
    false_alarm_rate: Number((fp / Math.max(fp + tn, 1)).toFixed(3)),
    confusion_matrix: { true_positive: tp, false_positive: fp, false_negative: fn, true_negative: tn },
  };
}

const data = parseCsv(readFileSync(dataPath, "utf8")).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
const times = [...new Set(data.map((row) => row.timestamp))];
const cutoff = times[Math.floor(times.length * 0.75)];
const train = data.filter((row) => row.timestamp < cutoff);
const test = data.filter((row) => row.timestamp >= cutoff);
const normalRows = train.filter((row) => row.failure_within_24h === 0);
const scaler = {
  means: Object.fromEntries(FEATURES.map((feature) => [feature, mean(normalRows.map((row) => row[feature]))])),
  stdevs: {},
};
for (const feature of FEATURES) scaler.stdevs[feature] = deviation(normalRows.map((row) => row[feature]), scaler.means[feature]);
const logistic = trainLogistic(train, scaler);
const provisionalAnomalyArtifact = { scaler, features: FEATURES, anomalyBounds: { low: 0, high: 1 } };
const normalRaw = normalRows.map((row) => anomalyRaw(row, provisionalAnomalyArtifact));
const anomalyBounds = { low: percentile(normalRaw, 0.05), high: percentile(normalRaw, 0.95) };
const anomalyArtifact = { scaler, anomalyBounds, features: FEATURES };
const riskArtifact = { scaler, logistic, features: FEATURES };
const scoredTest = test.map((row) => ({ ...row, risk_probability: riskProbability(row, riskArtifact), anomaly_percent: anomalyPercent(row, anomalyArtifact) }));
const evaluated = scoredTest.map((row) => ({ label: row.failure_within_24h, prediction: row.risk_probability >= 0.5 ? 1 : 0 }));
const metrics = classificationMetrics(evaluated);

const latestByMachine = new Map();
for (const row of data) latestByMachine.set(row.machine_id, row);
const rankedMachines = [...latestByMachine.values()].map((row) => {
  const riskPercent = Math.round(riskProbability(row, riskArtifact) * 100);
  const currentAnomalyPercent = anomalyPercent(row, anomalyArtifact);
  const highVibration = row.vibration_mm_s > scaler.means.vibration_mm_s + 2 * scaler.stdevs.vibration_mm_s;
  const lowCoolant = row.coolant_flow_l_min < scaler.means.coolant_flow_l_min - 2 * scaler.stdevs.coolant_flow_l_min;
  return {
    machine_id: row.machine_id, machine_name: row.machine_name, process: row.process,
    risk_percent: riskPercent, anomaly_percent: currentAnomalyPercent,
    estimated_downtime_hours: riskPercent >= 70 ? 4.5 : riskPercent >= 40 ? 1.8 : 0.4,
    recommended_action: highVibration ? "Rulman yatağını ve bağlantıları kontrol et" : lowCoolant ? "Soğutma pompası ve filtreyi incele" : riskPercent >= 40 ? "Planlı saha kontrolü oluştur" : "Normal izlemeye devam et",
  };
}).sort((a, b) => b.risk_percent - a.risk_percent || b.anomaly_percent - a.anomaly_percent);

const featureImportance = FEATURES.map((feature, index) => ({ feature, coefficient: Number(logistic.weights[index + 1].toFixed(4)), importance: Number(Math.abs(logistic.weights[index + 1]).toFixed(4)) })).sort((a, b) => b.importance - a.importance);
const report = {
  generated_at: new Date().toISOString(),
  disclaimer: "Metrikler sentetik telemetri üzerinde zaman bazlı test ayrımıyla hesaplanmıştır; gerçek fabrika performansı değildir.",
  model: {
    anomaly_detector: "Referans normal dağılıma göre çok değişkenli z-score",
    risk_model: "Ağırlıklı lojistik regresyon (gradient descent)", features: FEATURES, feature_importance: featureImportance,
  },
  offline_evaluation: metrics,
  latest_snapshot: { timestamp: times.at(-1), machines: rankedMachines },
};

mkdirSync(dirname(reportPath), { recursive: true });
mkdirSync(dirname(dashboardPath), { recursive: true });
mkdirSync(dirname(anomalyModelPath), { recursive: true });
writeFileSync(anomalyModelPath, JSON.stringify(anomalyArtifact, null, 2), "utf8");
writeFileSync(riskModelPath, JSON.stringify(riskArtifact, null, 2), "utf8");
writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
writeFileSync(dashboardPath, JSON.stringify(report, null, 2), "utf8");
writeFileSync(dashboardRiskModelPath, JSON.stringify(riskArtifact, null, 2), "utf8");
writeFileSync(dashboardAnomalyModelPath, JSON.stringify(anomalyArtifact, null, 2), "utf8");
const scoredCsv = [
  "timestamp,machine_id,risk_probability,anomaly_percent,failure_within_24h",
  ...scoredTest.map((row) => `${row.timestamp},${row.machine_id},${row.risk_probability.toFixed(6)},${row.anomaly_percent},${row.failure_within_24h}`),
].join("\n");
writeFileSync(resolve(root, "data", "scored_test_telemetry.csv"), scoredCsv, "utf8");
console.log(JSON.stringify(metrics, null, 2));
console.log(`Dashboard report: ${dashboardPath}`);

