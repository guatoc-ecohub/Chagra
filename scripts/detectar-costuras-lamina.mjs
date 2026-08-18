#!/usr/bin/env node

/**
 * Deterministic seam detector for 2.5D "live sheet" PNGs.
 *
 * The detector is intentionally CPU-only and model-free. It looks for a
 * bright ridge that is locally brighter than both sides of its neighbourhood
 * and then accumulates that ridge on straight Hough lines. It does not alter
 * source images or write derived images.
 */

import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const DEFAULTS = Object.freeze({
  ridgeThreshold: 22,
  minimumLuminance: 88,
  houghAngleStep: 2,
  houghBand: 2,
  minimumSupportPixels: 24,
  minimumRunPixels: 70,
  minimumLineSpan: 100,
  maxLineGap: 8,
  alertScore: 0.18,
});

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function colorDistance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function pixelIndex(x, y, width) {
  return y * width + x;
}

function estimateBackground(rgb, width, height) {
  const buckets = new Map();
  const step = Math.max(1, Math.floor(Math.min(width, height) / 160));
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = pixelIndex(x, y, width) * 3;
      const key = `${rgb[i] >> 3},${rgb[i + 1] >> 3},${rgb[i + 2] >> 3}`;
      const bucket = buckets.get(key) ?? { count: 0, sum: [0, 0, 0] };
      bucket.count += 1;
      bucket.sum[0] += rgb[i];
      bucket.sum[1] += rgb[i + 1];
      bucket.sum[2] += rgb[i + 2];
      buckets.set(key, bucket);
    }
  }
  const winner = [...buckets.values()].sort((a, b) => b.count - a.count)[0];
  return winner ? winner.sum.map((value) => value / winner.count) : [0, 0, 0];
}

function buildSubjectMask(rgb, alpha, width, height) {
  const background = estimateBackground(rgb, width, height);
  const alphaCoverage = alpha.reduce((sum, value) => sum + (value > 16 ? 1 : 0), 0) / alpha.length;
  const opaqueScreenshot = alphaCoverage > 0.995;
  const mask = new Uint8Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = pixelIndex(x, y, width);
      const rgbIndex = pixel * 3;
      const visible = alpha[pixel] > 16;
      const foreground = opaqueScreenshot
        ? colorDistance([rgb[rgbIndex], rgb[rgbIndex + 1], rgb[rgbIndex + 2]], background) > 18
        : visible;
      mask[pixel] = foreground ? 1 : 0;
    }
  }

  return { mask, background, alphaCoverage };
}

function erodeMask(mask, width, height, radius = 3) {
  const eroded = new Uint8Array(mask.length);
  for (let y = radius; y < height - radius; y += 1) {
    for (let x = radius; x < width - radius; x += 1) {
      let inside = 1;
      for (let dy = -radius; dy <= radius && inside; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (!mask[pixelIndex(x + dx, y + dy, width)]) {
            inside = 0;
            break;
          }
        }
      }
      eroded[pixelIndex(x, y, width)] = inside;
    }
  }
  return eroded;
}

function buildRidgeResponse(gray, subject, width, height, threshold) {
  const response = new Float32Array(width * height);
  const directions = [
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
  ];
  let candidateCount = 0;

  for (let y = 6; y < height - 6; y += 1) {
    for (let x = 6; x < width - 6; x += 1) {
      const pixel = pixelIndex(x, y, width);
      if (!subject[pixel] || gray[pixel] < DEFAULTS.minimumLuminance) continue;

      let best = 0;
      for (const [dx, dy] of directions) {
        for (const radius of [2, 4, 6]) {
          const x1 = x + dx * radius;
          const y1 = y + dy * radius;
          const x2 = x - dx * radius;
          const y2 = y - dy * radius;
          if (!subject[pixelIndex(x1, y1, width)] || !subject[pixelIndex(x2, y2, width)]) continue;
          const sideMean = (gray[pixelIndex(x1, y1, width)] + gray[pixelIndex(x2, y2, width)]) / 2;
          best = Math.max(best, gray[pixel] - sideMean);
        }
      }

      if (best >= threshold) {
        response[pixel] = best;
        candidateCount += 1;
      }
    }
  }
  return { response, candidateCount };
}

function houghBestLine(response, rgb, width, height, options) {
  const rhoOffset = height + width;
  const candidates = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = response[pixelIndex(x, y, width)];
      if (value) candidates.push({ x, y, value });
    }
  }
  let best = null;
  for (let lineAngle = 0; lineAngle < 180; lineAngle += options.houghAngleStep) {
    const normalAngle = (lineAngle + 90) * Math.PI / 180;
    const cos = Math.cos(normalAngle);
    const sin = Math.sin(normalAngle);
    const groups = new Map();
    for (const candidate of candidates) {
      const rho = Math.round(candidate.x * cos + candidate.y * sin);
      const group = groups.get(rho) ?? [];
      const rgbIndex = pixelIndex(candidate.x, candidate.y, width) * 3;
      const r = rgb[rgbIndex];
      const g = rgb[rgbIndex + 1];
      const b = rgb[rgbIndex + 2];
      group.push({
        t: -candidate.x * sin + candidate.y * cos,
        value: candidate.value,
        luma: luminance(r, g, b),
        chroma: Math.max(r, g, b) - Math.min(r, g, b),
      });
      groups.set(rho, group);
    }

    for (const [rho, support] of groups) {
      if (support.length < options.minimumSupportPixels) continue;
      support.sort((a, b) => a.t - b.t);

      let longestRun = 1;
      let run = 1;
      for (let i = 1; i < support.length; i += 1) {
        if (support[i].t - support[i - 1].t <= options.maxLineGap) run += 1;
        else run = 1;
        longestRun = Math.max(longestRun, run);
      }
      const span = support.at(-1).t - support[0].t;
      if (longestRun < options.minimumRunPixels || span < options.minimumLineSpan) continue;

      const meanResponse = support.reduce((sum, item) => sum + item.value, 0) / support.length;
      const meanLuma = support.reduce((sum, item) => sum + item.luma, 0) / support.length;
      const meanChroma = support.reduce((sum, item) => sum + item.chroma, 0) / support.length;
      const continuity = longestRun / Math.max(span, 1);
      const lengthFactor = Math.min(1, longestRun / 120);
      const density = Math.min(1, support.length / Math.max(span * 0.45, 1));
      const brightness = Math.min(1, meanResponse / 50);
      // Natural orange highlights can also be straight over a short span.
      // Crossfade seams in this set are pale ridges, so retain the structural
      // score only when the line is both light enough and not strongly chromatic.
      const lightAppearance = Math.max(0, Math.min(1, (meanLuma - 110) / 60));
      const paleAppearance = Math.max(0, Math.min(1, (130 - meanChroma) / 80));
      const appearance = lightAppearance * paleAppearance;
      const score = continuity * lengthFactor * density * brightness * appearance;
      const candidate = {
        score,
        angleDegrees: lineAngle,
        rho,
        supportPixels: support.length,
        longestRunPixels: longestRun,
        lineSpanPixels: span,
        lineCoveragePercent: (longestRun / Math.max(span, 1)) * 100,
        meanRidgeResidual: meanResponse,
        meanLineLuminance: meanLuma,
        meanLineChroma: meanChroma,
        appearanceScore: appearance,
      };
      if (!best || candidate.score > best.score) best = candidate;
    }
  }
  return best;
}

async function detect(imagePath, options) {
  const { data, info } = await sharp(imagePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const rgb = new Uint8Array(width * height * 3);
  const alpha = new Uint8Array(width * height);
  const gray = new Float32Array(width * height);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const input = pixel * channels;
    const output = pixel * 3;
    rgb[output] = data[input];
    rgb[output + 1] = data[input + 1];
    rgb[output + 2] = data[input + 2];
    alpha[pixel] = data[input + 3] ?? 255;
    gray[pixel] = luminance(data[input], data[input + 1], data[input + 2]);
  }

  const { mask, background, alphaCoverage } = buildSubjectMask(rgb, alpha, width, height);
  const subject = erodeMask(mask, width, height);
  let subjectPixels = 0;
  for (const value of subject) subjectPixels += value;
  const { response, candidateCount } = buildRidgeResponse(gray, subject, width, height, options.ridgeThreshold);
  const line = houghBestLine(response, rgb, width, height, options);
  const signalPercent = subjectPixels ? (candidateCount / subjectPixels) * 100 : 0;
  return {
    image: path.resolve(imagePath),
    dimensions: `${width}x${height}`,
    backgroundRgb: background.map((value) => Math.round(value)),
    alphaCoveragePercent: alphaCoverage * 100,
    subjectPixels,
    ridgeCandidatePixels: candidateCount,
    ridgeCandidatePercentOfSubject: signalPercent,
    threshold: {
      ridgeResidualLuma: options.ridgeThreshold,
      minimumLuminance: options.minimumLuminance,
      alertScore: options.alertScore,
    },
    line,
    verdict: line && line.score >= options.alertScore ? 'SEAM_SIGNAL_HIGH' : 'SEAM_SIGNAL_LOW',
  };
}

function parseArgs(argv) {
  const paths = [];
  const options = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') options.json = true;
    else if (arg === '--ridge-threshold') options.ridgeThreshold = Number(argv[++i]);
    else if (arg === '--alert-score') options.alertScore = Number(argv[++i]);
    else if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    else paths.push(arg);
  }
  if (!paths.length) throw new Error('Usage: node scripts/detectar-costuras-lamina.mjs [--json] IMAGE [IMAGE ...]');
  return { paths, options };
}

const { paths, options } = parseArgs(process.argv.slice(2));
const results = await Promise.all(paths.map((imagePath) => detect(imagePath, options)));
if (options.json) console.log(JSON.stringify({ detector: 'bright-ridge-hough-v1', results }, null, 2));
else {
  console.log(`detector=bright-ridge-hough-v1 ridgeThreshold=${options.ridgeThreshold} alertScore=${options.alertScore}`);
  for (const result of results) {
    const line = result.line;
    console.log([
      result.verdict,
      result.image,
      `score=${line?.score.toFixed(4) ?? '0.0000'}`,
      `candidates=${result.ridgeCandidatePixels}/${result.subjectPixels} (${result.ridgeCandidatePercentOfSubject.toFixed(3)}%)`,
      `run=${line?.longestRunPixels ?? 0}px`,
      `span=${line?.lineSpanPixels?.toFixed(1) ?? '0.0'}px`,
      `coverage=${line?.lineCoveragePercent?.toFixed(1) ?? '0.0'}%`,
    ].join(' '));
  }
}
