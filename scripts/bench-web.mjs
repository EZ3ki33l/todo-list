#!/usr/bin/env node
/**
 * Mesure TTFB / temps total sur routes web locales.
 * Usage: node scripts/bench-web.mjs [baseUrl]
 */

const BASE = process.argv[2] ?? "http://127.0.0.1:3000";
const ROUTES = ["/login", "/dashboard", "/dashboard/shopping"];
const RUNS = 8;

function stats(nums) {
  const sorted = [...nums].sort((a, b) => a - b);
  const med = sorted[Math.floor(sorted.length / 2)];
  const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1];
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  return { med, p95, avg, min: sorted[0], max: sorted[sorted.length - 1] };
}

function gradeTtfb(ms) {
  if (ms < 800) return "✅ bon";
  if (ms < 1800) return "⚠️ moyen";
  return "❌ lent";
}

function gradeApi(ms) {
  if (ms < 200) return "✅ excellent";
  if (ms < 500) return "✅ bon";
  if (ms < 1000) return "⚠️ acceptable";
  return "❌ lent";
}

async function measure(path) {
  const url = `${BASE}${path}`;
  const start = performance.now();
  const res = await fetch(url, { redirect: "follow" });
  const ttfb = performance.now() - start;
  await res.arrayBuffer();
  const total = performance.now() - start;
  return { status: res.status, ttfb, total };
}

console.log(`Base: ${BASE}\n`);

for (const path of ROUTES) {
  const ttfbs = [];
  const totals = [];
  const statuses = [];
  for (let i = 0; i < RUNS; i++) {
    try {
      const r = await measure(path);
      ttfbs.push(r.ttfb);
      totals.push(r.total);
      statuses.push(r.status);
    } catch (e) {
      console.error(`Erreur ${path}:`, e.message);
      process.exit(1);
    }
  }
  const t = stats(ttfbs);
  const tot = stats(totals);
  console.log(`## ${path}`);
  console.log(`  HTTP ${[...new Set(statuses)].join(",")}`);
  console.log(
    `  TTFB  médiane ${t.med.toFixed(0)}ms · p95 ${t.p95.toFixed(0)}ms · ${gradeTtfb(t.med)}`,
  );
  console.log(
    `  Total médiane ${tot.med.toFixed(0)}ms · p95 ${tot.p95.toFixed(0)}ms`,
  );
  console.log("");
}

console.log("Référentiels (Google / usage courant):");
console.log("  TTFB page: < 800ms bon · < 1800ms acceptable");
console.log("  API tRPC (app): < 200ms excellent · < 500ms bon");
