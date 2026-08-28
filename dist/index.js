"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  buildSshArgs: () => buildSshArgs,
  generateOtp: () => generateOtp,
  isValidPort: () => isValidPort,
  isValidTarget: () => isValidTarget,
  loadConfig: () => loadConfig
});
module.exports = __toCommonJS(index_exports);

// src/config/index.ts
var loadConfig = (overrides = {}) => ({
  port: overrides.port ?? Number(process.env.PORT ?? 3e3),
  host: overrides.host ?? process.env.HOST ?? "localhost",
  securityEnabled: overrides.securityEnabled ?? false,
  useTls: overrides.useTls ?? process.env.USE_TLS !== "false",
  certPath: process.env.CERT_PATH,
  keyPath: process.env.KEY_PATH,
  otp: overrides.otp,
  tokenTtl: overrides.tokenTtl ?? 300,
  jwtPrivateKey: overrides.jwtPrivateKey,
  jwtPublicKey: overrides.jwtPublicKey,
  file: overrides.file ?? ""
});

// src/core/security/otp.ts
var import_crypto = require("crypto");
var generateOtp = () => String((0, import_crypto.randomInt)(1e5, 1e6));

// src/core/tunnel/buildSshArgs.ts
var buildSshArgs = (request) => {
  const args = [
    "-N",
    "-L",
    `${request.localPort}:${request.remoteHost}:${request.remotePort}`
  ];
  if (request.sshPort !== void 0) {
    args.push("-p", String(request.sshPort));
  }
  if (request.identity !== void 0) {
    args.push("-i", request.identity, "-o", "IdentitiesOnly=yes");
  }
  args.push(
    "-o",
    "ExitOnForwardFailure=yes",
    "-o",
    "StrictHostKeyChecking=accept-new",
    "-o",
    "ServerAliveInterval=30",
    "-o",
    "ServerAliveCountMax=3",
    request.target
  );
  return args;
};

// src/core/tunnel/validator.ts
var isValidPort = (value) => Number.isInteger(value) && value >= 1 && value <= 65535;
var isValidTarget = (target) => {
  const trimmed = target.trim();
  return trimmed.length > 0 && !trimmed.startsWith("-");
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildSshArgs,
  generateOtp,
  isValidPort,
  isValidTarget,
  loadConfig
});
