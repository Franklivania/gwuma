import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const root = resolve(import.meta.dirname, "..");
const packagePath = resolve(root, "package.json");
const tauriConfigPath = resolve(root, "src-tauri", "tauri.conf.json");
const cargoPath = resolve(root, "src-tauri", "Cargo.toml");

const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
const requestedVersion = process.argv[2];
const version = requestedVersion ?? packageJson.version;

const semverPattern =
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?(?:\+[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?$/;

if (!semverPattern.test(version)) {
  throw new Error(`Invalid semantic version: ${version}`);
}

packageJson.version = version;

const tauriConfig = JSON.parse(await readFile(tauriConfigPath, "utf8"));
tauriConfig.version = version;

const cargoToml = await readFile(cargoPath, "utf8");
const packageVersionPattern = /(^\[package\][\s\S]*?^version\s*=\s*")[^"]+(")/m;

if (!packageVersionPattern.test(cargoToml)) {
  throw new Error("Could not locate [package] version in src-tauri/Cargo.toml");
}

const updatedCargoToml = cargoToml.replace(
  packageVersionPattern,
  `$1${version}$2`,
);

await Promise.all([
  writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`),
  writeFile(tauriConfigPath, `${JSON.stringify(tauriConfig, null, 2)}\n`),
  writeFile(cargoPath, updatedCargoToml),
]);

console.log(`Synchronized Gwuma version ${version}`);
