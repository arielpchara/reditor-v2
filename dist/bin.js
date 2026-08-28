#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/bin.ts
var import_path8 = __toESM(require("path"));

// src/adapters/cli/program.ts
var import_commander = require("commander");
var SERVE_DEFAULTS = {
  port: "3000",
  host: "localhost",
  forceDisableSecurity: false,
  tokenTtl: "300",
  forceOtp: void 0,
  create: false
};
var TUNNEL_DEFAULTS = {
  port: "8080",
  remotePort: "3000"
};
var buildProgram = () => {
  const program = new import_commander.Command();
  program.name("reditor").description("Edit files from your server in the browser.");
  program.command("serve", { isDefault: true }).description("Start the web server").argument("[file]", "Path to the file to edit in the browser").option("-p, --port <port>", "Port to listen on", "3000").option("-H, --host <host>", "Host to bind to", "localhost").option(
    "--force-disable-security",
    "[DANGER] Disable OTP and JWT auth \u2014 anyone on the network can access the file",
    false
  ).option("--token-ttl <seconds>", "JWT token time-to-live in seconds", "300").option("--force-otp <otp>", "[TEST ONLY] Override the generated OTP with a fixed value").option("--create", "Create the file if it does not exist (skips confirmation prompt)", false).action(() => {
  });
  program.command("tunnel").description("Open an SSH tunnel from this machine to a remote reditor serve").argument("[target]", "SSH target (user@host or an SSH config Host)").option("-p, --port <port>", "Local port to listen on", "8080").option("--remote-port <port>", "Remote reditor serve port", "3000").action(() => {
  });
  return program;
};
var parseCli = (argv) => {
  const program = buildProgram();
  program.parse(argv);
  const invokedTunnel = argv.slice(2)[0] === "tunnel";
  if (invokedTunnel) {
    const cmd2 = program.commands.find((c) => c.name() === "tunnel");
    const opts2 = cmd2?.opts() ?? TUNNEL_DEFAULTS;
    return { command: "tunnel", opts: opts2, target: cmd2?.args[0] };
  }
  const cmd = program.commands.find((c) => c.name() === "serve");
  const opts = cmd?.opts() ?? SERVE_DEFAULTS;
  return { command: "serve", opts, file: cmd?.args[0] };
};

// src/adapters/http/server.ts
var import_express2 = __toESM(require("express"));
var import_https = __toESM(require("https"));
var import_http = __toESM(require("http"));
var import_fs = __toESM(require("fs"));
var import_selfsigned = __toESM(require("selfsigned"));

// src/adapters/http/handlers.ts
var makeHealthHandler = ({ config, logger: logger2 }) => {
  return (_req, res) => {
    logger2.debug("Health check requested");
    res.json({ status: "ok", securityEnabled: config.securityEnabled });
  };
};

// src/core/security/otp.ts
var import_crypto = require("crypto");
var generateOtp = () => String((0, import_crypto.randomInt)(1e5, 1e6));
var otpMatches = (provided, expected) => {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return (0, import_crypto.timingSafeEqual)(a, b);
};

// src/adapters/http/authHandlers.ts
var MAX_OTP_ATTEMPTS = 3;
var readOtp = (body) => {
  if (typeof body !== "object" || body === null) return void 0;
  if (!("otp" in body)) return void 0;
  const value = body.otp;
  return typeof value === "string" ? value : void 0;
};
var makeExchangeTokenHandler = ({ config, logger: logger2, tokens }, deps = {}) => {
  const exit = deps.exit ?? ((code) => process.exit(code));
  let failedAttempts = 0;
  let otp = config.otp;
  let consumed = false;
  return (req, res) => {
    if (!config.securityEnabled || !config.otp) {
      logger2.warn("Token exchange rejected because security is disabled");
      res.status(403).json({ error: "Security is not enabled" });
      return;
    }
    if (consumed || !otp) {
      logger2.warn("Token exchange rejected: OTP already used", { ip: req.ip });
      res.status(401).json({ error: "OTP has already been used" });
      return;
    }
    const provided = readOtp(req.body);
    if (!provided || !otpMatches(provided, otp)) {
      failedAttempts += 1;
      const remaining = MAX_OTP_ATTEMPTS - failedAttempts;
      logger2.warn("Token exchange rejected due to invalid OTP", {
        hasOtp: Boolean(provided),
        ip: req.ip,
        failedAttempts,
        remaining
      });
      if (failedAttempts >= MAX_OTP_ATTEMPTS) {
        logger2.error(
          `OTP max attempts (${MAX_OTP_ATTEMPTS}) exceeded \u2014 shutting down for security`,
          { ip: req.ip }
        );
        res.status(401).json({ error: "Invalid OTP. Maximum attempts exceeded \u2014 server is shutting down." });
        setTimeout(() => exit(1), 200);
        return;
      }
      res.status(401).json({ error: "Invalid OTP", attemptsLeft: remaining });
      return;
    }
    if (!config.jwtPrivateKey) {
      logger2.error("Token exchange failed: signing key not available");
      res.status(500).json({ error: "Signing key not available" });
      return;
    }
    const result = tokens.buildTokenResult(
      { privateKey: config.jwtPrivateKey, publicKey: config.jwtPublicKey ?? "" },
      config.tokenTtl
    );
    failedAttempts = 0;
    consumed = true;
    otp = void 0;
    logger2.info("Token exchange succeeded", { ip: req.ip, ttlSeconds: config.tokenTtl });
    res.json(result);
  };
};

// src/adapters/http/fileHandlers.ts
var import_path = __toESM(require("path"));
var makeFileHandler = ({ config, logger: logger2, files }) => {
  return (_req, res) => {
    const result = files.read(import_path.default.dirname(config.file), import_path.default.basename(config.file));
    if (!result.ok) {
      const { error } = result;
      switch (error.kind) {
        case "NOT_FOUND":
          logger2.warn("Configured file not found when handling /file request", {
            file: error.path
          });
          res.status(404).json({ error: `File not found: ${error.path}` });
          return;
        case "NOT_TEXT":
          logger2.warn("Configured file is not readable as text", { file: error.path });
          res.status(422).json({ error: "File is not readable as text" });
          return;
        case "TOO_LARGE":
          logger2.warn("Configured file exceeds size limit", {
            file: error.path,
            sizeBytes: error.sizeBytes,
            maxBytes: error.maxBytes
          });
          res.status(413).json({
            error: `File too large for editor (${error.sizeBytes} bytes, max ${error.maxBytes} bytes)`
          });
          return;
        case "IS_DIRECTORY":
          logger2.warn("Configured file path is a directory", { file: error.path });
          res.status(422).json({ error: "Path points to a directory, not a file" });
          return;
        case "READ_ERROR":
          logger2.error("Failed to read configured file", {
            file: error.path,
            error: error.message
          });
          res.status(500).json({ error: `Could not read file: ${error.message}` });
          return;
        case "PATH_TRAVERSAL":
          logger2.error("Path traversal detected for configured file", { file: error.path });
          res.status(500).json({ error: "Internal configuration error" });
          return;
      }
    }
    logger2.info("Served configured file content", {
      file: config.file,
      sizeBytes: result.file.sizeBytes
    });
    res.type("text/plain").send(result.file.content);
  };
};

// src/adapters/http/fileSaveHandler.ts
var makeFileSaveHandler = ({ config, logger: logger2, files }) => {
  return (req, res) => {
    const body = typeof req.body === "object" && req.body !== null ? req.body : void 0;
    const content = body?.content;
    if (typeof content !== "string") {
      res.status(400).json({ error: 'Request body must contain a "content" string field' });
      return;
    }
    const result = files.write(config.file, content);
    if (!result.ok) {
      const { error } = result;
      switch (error.kind) {
        case "TOO_LARGE":
          logger2.warn("Save rejected: content exceeds size limit", {
            file: config.file,
            sizeBytes: error.sizeBytes,
            maxBytes: error.maxBytes
          });
          res.status(413).json({
            error: `Content too large (${error.sizeBytes} bytes, max ${error.maxBytes} bytes)`
          });
          return;
        case "WRITE_ERROR":
          logger2.error("Failed to write file", { file: config.file, error: error.message });
          res.status(500).json({ error: `Could not write file: ${error.message}` });
          return;
      }
    }
    logger2.info("File saved successfully", {
      file: config.file,
      sizeBytes: Buffer.byteLength(content, "utf8")
    });
    res.status(204).send();
  };
};

// src/adapters/http/fileMetaHandler.ts
var import_path2 = __toESM(require("path"));
var MIME_MAP = {
  ts: "text/typescript",
  tsx: "text/tsx",
  js: "text/javascript",
  jsx: "text/jsx",
  mjs: "text/javascript",
  cjs: "text/javascript",
  json: "application/json",
  html: "text/html",
  xml: "text/xml",
  svg: "image/svg+xml",
  css: "text/css",
  scss: "text/x-scss",
  sh: "text/x-shellscript",
  bash: "text/x-shellscript",
  zsh: "text/x-shellscript",
  yml: "text/yaml",
  yaml: "text/yaml",
  md: "text/markdown",
  mdx: "text/mdx",
  py: "text/x-python",
  rs: "text/x-rust",
  go: "text/x-go",
  sql: "text/x-sql",
  txt: "text/plain",
  env: "text/plain",
  toml: "text/x-toml",
  ini: "text/x-ini",
  conf: "text/plain"
};
var getMimeType = (filepath) => {
  const ext = import_path2.default.extname(filepath).replace(".", "").toLowerCase();
  return MIME_MAP[ext] ?? "text/plain";
};
var makeFileMetaHandler = ({ config, logger: logger2, files }) => {
  return (_req, res) => {
    const filename = import_path2.default.basename(config.file);
    const { sizeBytes, hasShebang } = files.meta(config.file);
    const type = getMimeType(config.file);
    logger2.debug("Served file metadata", { filename, size: sizeBytes, type, hasShebang });
    res.json({ filename, size: sizeBytes, type, hasShebang });
  };
};

// src/adapters/http/authMiddleware.ts
var makeAuthMiddleware = ({ config, logger: logger2, tokens }) => (req, res, next) => {
  if (!config.securityEnabled) {
    next();
    return;
  }
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    logger2.warn("Request blocked: missing or malformed Authorization header", {
      path: req.path,
      ip: req.ip
    });
    res.status(401).json({ error: "Authorization header missing or malformed" });
    return;
  }
  const token = authHeader.slice(7);
  const result = tokens.verifyToken(token, config.jwtPublicKey ?? "");
  if (!result.ok) {
    logger2.warn("Request blocked: invalid or expired JWT token", {
      path: req.path,
      ip: req.ip
    });
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  logger2.debug("Request authorized via JWT", { path: req.path, ip: req.ip });
  next();
};

// src/adapters/http/routes.ts
var registerRoutes = (app, runtime) => {
  const { config, logger: logger2 } = runtime;
  app.get("/health", makeHealthHandler(runtime));
  logger2.info("Registered route: GET /health");
  if (config.securityEnabled) {
    app.post("/auth/exchange-token", makeExchangeTokenHandler(runtime));
    logger2.info("Registered route: POST /auth/exchange-token (security enabled)");
  }
  const auth = makeAuthMiddleware(runtime);
  app.get("/file-meta", auth, makeFileMetaHandler(runtime));
  logger2.info("Registered route: GET /file-meta", { authRequired: config.securityEnabled });
  app.get("/file", auth, makeFileHandler(runtime));
  logger2.info("Registered route: GET /file", {
    authRequired: config.securityEnabled,
    file: config.file
  });
  app.put("/file", auth, makeFileSaveHandler(runtime));
  logger2.info("Registered route: PUT /file", { authRequired: config.securityEnabled });
};

// src/adapters/http/staticHandler.ts
var import_express = __toESM(require("express"));
var import_path3 = __toESM(require("path"));
var resolveWebDir = () => __filename.endsWith(".ts") ? import_path3.default.resolve(process.cwd(), "dist/web") : import_path3.default.resolve(__dirname, "web");
var createStaticHandler = (logger2) => {
  const webDir = resolveWebDir();
  logger2.info("Serving static files", { webDir });
  return import_express.default.static(webDir);
};

// src/adapters/http/securityHeaders.ts
var securityHeaders = (_req, res, next) => {
  res.setHeader("Content-Security-Policy", "frame-ancestors 'none'");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
};

// src/adapters/http/errorHandler.ts
var makeErrorHandler = (logger2) => {
  return (err, req, res, _next) => {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : void 0;
    logger2.error("Unhandled error", { path: req.path, error: message, stack });
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  };
};

// src/adapters/http/server.ts
var createApp = (runtime) => {
  const { config, logger: logger2 } = runtime;
  logger2.info("Initialising Express app", { useTls: config.useTls, file: config.file });
  const app = (0, import_express2.default)();
  app.use(import_express2.default.json({ limit: "1mb" }));
  app.use(securityHeaders);
  app.use((req, _res, next) => {
    logger2.info("Incoming request", { method: req.method, path: req.path, ip: req.ip });
    next();
  });
  registerRoutes(app, runtime);
  app.use(createStaticHandler(logger2));
  app.use(makeErrorHandler(logger2));
  return app;
};
var resolveTlsOptions = async (config, logger2) => {
  if (config.certPath && config.keyPath) {
    logger2.info("Using configured TLS certificate and key", {
      certPath: config.certPath,
      keyPath: config.keyPath
    });
    return {
      cert: import_fs.default.readFileSync(config.certPath, "utf8"),
      key: import_fs.default.readFileSync(config.keyPath, "utf8")
    };
  }
  logger2.info("No TLS cert configured; generating self-signed certificate for development");
  const attrs = [{ name: "commonName", value: config.host }];
  const pems = await import_selfsigned.default.generate(attrs, { algorithm: "sha256" });
  return { key: pems.private, cert: pems.cert };
};
var startServer = (runtime) => new Promise((resolve, reject) => {
  const { config, logger: logger2 } = runtime;
  const app = createApp(runtime);
  if (config.useTls) {
    resolveTlsOptions(config, logger2).then((tlsOptions) => {
      const server = import_https.default.createServer(tlsOptions, app);
      server.listen(config.port, config.host, () => {
        logger2.info("Server listening", {
          protocol: "https",
          host: config.host,
          port: config.port
        });
        resolve(server);
      });
      server.on("error", reject);
    }).catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : void 0;
      logger2.error("Failed to resolve TLS options", { error: message, stack });
      reject(err);
    });
  } else {
    const server = import_http.default.createServer(app);
    server.listen(config.port, config.host, () => {
      logger2.info("Server listening", {
        protocol: "http",
        host: config.host,
        port: config.port
      });
      resolve(server);
    });
    server.on("error", reject);
  }
});

// src/core/tunnel/buildSshArgs.ts
var DEFAULT_TUNNEL_REMOTE_HOST = "127.0.0.1";
var buildSshArgs = (request) => [
  "-N",
  "-L",
  `${request.localPort}:${request.remoteHost}:${request.remotePort}`,
  "-o",
  "ExitOnForwardFailure=yes",
  "-o",
  "ServerAliveInterval=30",
  "-o",
  "ServerAliveCountMax=3",
  request.target
];

// src/core/tunnel/validator.ts
var isValidPort = (value) => Number.isInteger(value) && value >= 1 && value <= 65535;
var isValidTarget = (target) => {
  const trimmed = target.trim();
  return trimmed.length > 0 && !trimmed.startsWith("-");
};

// src/config/index.ts
var loadConfig = (overrides = {}) => ({
  port: overrides.port ?? Number(process.env.PORT ?? 3e3),
  host: overrides.host ?? process.env.HOST ?? "localhost",
  securityEnabled: overrides.securityEnabled ?? true,
  useTls: overrides.useTls ?? process.env.USE_TLS !== "false",
  certPath: process.env.CERT_PATH,
  keyPath: process.env.KEY_PATH,
  otp: overrides.otp,
  tokenTtl: overrides.tokenTtl ?? 300,
  jwtPrivateKey: overrides.jwtPrivateKey,
  jwtPublicKey: overrides.jwtPublicKey,
  file: overrides.file ?? ""
});

// src/adapters/logger/logger.ts
var import_fs2 = __toESM(require("fs"));
var import_path4 = __toESM(require("path"));
var import_winston = __toESM(require("winston"));
var LOG_DIR = import_path4.default.resolve(process.cwd(), "logs");
import_fs2.default.mkdirSync(LOG_DIR, { recursive: true });
var LOG_FILE_ID = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
var logFilePath = import_path4.default.join(LOG_DIR, `reditor-${LOG_FILE_ID}.log`);
var consoleFormat = import_winston.default.format.combine(
  import_winston.default.format.colorize(),
  import_winston.default.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  import_winston.default.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaSuffix = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} [${level}]: ${message}${metaSuffix}`;
  })
);
var winstonLogger = import_winston.default.createLogger({
  level: process.env.LOG_LEVEL ?? "info",
  transports: [
    new import_winston.default.transports.Console({
      format: consoleFormat
    }),
    new import_winston.default.transports.File({
      filename: logFilePath,
      format: import_winston.default.format.combine(import_winston.default.format.timestamp(), import_winston.default.format.json())
    })
  ]
});
var log = (level) => (message, meta) => {
  if (meta) {
    winstonLogger[level](message, meta);
    return;
  }
  winstonLogger[level](message);
};
var logger = {
  info: log("info"),
  warn: log("warn"),
  error: log("error"),
  debug: log("debug")
};

// src/adapters/files/reader.ts
var import_fs3 = __toESM(require("fs"));
var import_path6 = __toESM(require("path"));

// src/core/files/validator.ts
var import_path5 = __toESM(require("path"));

// src/core/files/types.ts
var MAX_FILE_SIZE_BYTES = 524288;

// src/core/files/validator.ts
var isTextBuffer = (buf) => {
  if (buf.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(buf);
    return true;
  } catch {
    return false;
  }
};
var isWithinRoot = (rootDir, resolvedFilePath) => {
  const normalRoot = import_path5.default.resolve(rootDir) + import_path5.default.sep;
  const normalFile = import_path5.default.resolve(resolvedFilePath);
  return normalFile.startsWith(normalRoot) || normalFile === import_path5.default.resolve(rootDir);
};
var isWithinSizeLimit = (sizeBytes, maxBytes = MAX_FILE_SIZE_BYTES) => sizeBytes <= maxBytes;

// src/adapters/files/reader.ts
var errorMessage = (e) => e instanceof Error ? e.message : String(e);
var readFile = (rootDir, relativePath) => {
  const resolvedPath = import_path6.default.resolve(rootDir, relativePath);
  if (!isWithinRoot(rootDir, resolvedPath)) {
    return { ok: false, error: { kind: "PATH_TRAVERSAL", path: relativePath } };
  }
  if (!import_fs3.default.existsSync(resolvedPath)) {
    return { ok: false, error: { kind: "NOT_FOUND", path: relativePath } };
  }
  const stat = import_fs3.default.statSync(resolvedPath);
  if (stat.isDirectory()) {
    return { ok: false, error: { kind: "IS_DIRECTORY", path: relativePath } };
  }
  if (!isWithinSizeLimit(stat.size)) {
    return {
      ok: false,
      error: {
        kind: "TOO_LARGE",
        path: relativePath,
        sizeBytes: stat.size,
        maxBytes: MAX_FILE_SIZE_BYTES
      }
    };
  }
  let buf;
  try {
    buf = import_fs3.default.readFileSync(resolvedPath);
  } catch (e) {
    return {
      ok: false,
      error: { kind: "READ_ERROR", path: relativePath, message: errorMessage(e) }
    };
  }
  if (!isTextBuffer(buf)) {
    return { ok: false, error: { kind: "NOT_TEXT", path: relativePath } };
  }
  return {
    ok: true,
    file: { path: relativePath, content: buf.toString("utf8"), sizeBytes: stat.size }
  };
};

// src/adapters/files/writer.ts
var import_fs4 = __toESM(require("fs"));
var errorMessage2 = (e) => e instanceof Error ? e.message : String(e);
var unlinkIfExists = (filePath) => {
  try {
    import_fs4.default.unlinkSync(filePath);
  } catch {
    return;
  }
};
var writeFile = (absolutePath, content) => {
  const sizeBytes = Buffer.byteLength(content, "utf8");
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      error: { kind: "TOO_LARGE", path: absolutePath, sizeBytes, maxBytes: MAX_FILE_SIZE_BYTES }
    };
  }
  const tmpPath = `${absolutePath}.${process.pid}.tmp`;
  try {
    import_fs4.default.writeFileSync(tmpPath, content, "utf8");
    try {
      import_fs4.default.renameSync(tmpPath, absolutePath);
    } catch {
      import_fs4.default.copyFileSync(tmpPath, absolutePath);
      unlinkIfExists(tmpPath);
    }
    return { ok: true };
  } catch (e) {
    unlinkIfExists(tmpPath);
    return {
      ok: false,
      error: { kind: "WRITE_ERROR", path: absolutePath, message: errorMessage2(e) }
    };
  }
};

// src/adapters/files/creator.ts
var import_fs5 = __toESM(require("fs"));
var import_path7 = __toESM(require("path"));
var createFile = (filePath) => {
  try {
    import_fs5.default.mkdirSync(import_path7.default.dirname(filePath), { recursive: true });
    import_fs5.default.writeFileSync(filePath, "", { flag: "wx" });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: { kind: "CREATE_ERROR", path: filePath, message } };
  }
};

// src/adapters/files/validate.ts
var import_fs6 = __toESM(require("fs"));
var errorMessage3 = (e) => e instanceof Error ? e.message : String(e);
var validateFile = (absolutePath) => {
  if (!import_fs6.default.existsSync(absolutePath)) {
    return { ok: false, error: { kind: "NOT_FOUND", path: absolutePath } };
  }
  const stat = import_fs6.default.statSync(absolutePath);
  if (stat.isDirectory()) {
    return { ok: false, error: { kind: "IS_DIRECTORY", path: absolutePath } };
  }
  if (!isWithinSizeLimit(stat.size)) {
    return {
      ok: false,
      error: {
        kind: "TOO_LARGE",
        path: absolutePath,
        sizeBytes: stat.size,
        maxBytes: MAX_FILE_SIZE_BYTES
      }
    };
  }
  let buf;
  try {
    buf = import_fs6.default.readFileSync(absolutePath);
  } catch (e) {
    return {
      ok: false,
      error: { kind: "READ_ERROR", path: absolutePath, message: errorMessage3(e) }
    };
  }
  if (!isTextBuffer(buf)) {
    return { ok: false, error: { kind: "NOT_TEXT", path: absolutePath } };
  }
  return { ok: true };
};

// src/adapters/files/meta.ts
var import_fs7 = __toESM(require("fs"));
var detectShebang = (filepath) => {
  try {
    const fd = import_fs7.default.openSync(filepath, "r");
    const buf = Buffer.alloc(2);
    const bytesRead = import_fs7.default.readSync(fd, buf, 0, 2, 0);
    import_fs7.default.closeSync(fd);
    return bytesRead === 2 && buf[0] === 35 && buf[1] === 33;
  } catch {
    return false;
  }
};
var readFileMeta = (absolutePath) => {
  try {
    const sizeBytes = import_fs7.default.statSync(absolutePath).size;
    return { sizeBytes, hasShebang: detectShebang(absolutePath) };
  } catch {
    return { sizeBytes: 0, hasShebang: false };
  }
};

// src/adapters/files/store.ts
var createFileStore = () => ({
  read: readFile,
  write: writeFile,
  create: createFile,
  validate: validateFile,
  meta: readFileMeta
});

// src/adapters/security/jwt.ts
var import_jsonwebtoken = __toESM(require("jsonwebtoken"));
var errorMessage4 = (e) => e instanceof Error ? e.message : String(e);
var createToken = (privateKey, ttlSeconds) => {
  const now = Math.floor(Date.now() / 1e3);
  const payload = {
    sub: "reditor",
    iat: now,
    exp: now + ttlSeconds
  };
  return import_jsonwebtoken.default.sign(payload, privateKey, { algorithm: "RS256" });
};
var verifyToken = (token, publicKey) => {
  try {
    const decoded = import_jsonwebtoken.default.verify(token, publicKey, { algorithms: ["RS256"] });
    if (typeof decoded !== "object" || decoded === null) {
      return { ok: false, error: "Invalid token payload" };
    }
    const payload = decoded;
    return { ok: true, token, expiresIn: payload.exp - payload.iat };
  } catch (e) {
    return { ok: false, error: errorMessage4(e) };
  }
};
var buildTokenResult = (keys, ttlSeconds) => ({
  token: createToken(keys.privateKey, ttlSeconds),
  expiresIn: ttlSeconds
});
var createTokenService = () => ({
  buildTokenResult,
  verifyToken
});

// src/adapters/security/keys.ts
var import_crypto2 = require("crypto");
var generateKeyPair = () => {
  const { privateKey, publicKey } = (0, import_crypto2.generateKeyPairSync)("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" }
  });
  return { privateKey, publicKey };
};

// src/adapters/cli/promptCreate.ts
var import_readline = __toESM(require("readline"));
var promptCreateFile = (filePath, createInterface = import_readline.default.createInterface) => new Promise((resolve) => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  rl.question(`
  File not found: ${filePath}
  Create it? [y/N] `, (answer) => {
    rl.close();
    resolve(answer.trim().toLowerCase() === "y");
  });
});

// src/adapters/tunnel/openTunnel.ts
var import_child_process = require("child_process");
var openSshTunnel = (request, spawnFn = import_child_process.spawn) => {
  const child = spawnFn("ssh", buildSshArgs(request), { stdio: "inherit" });
  let settled = false;
  const wait = () => new Promise((resolve, reject) => {
    child.once("error", (err) => {
      if (settled) {
        return;
      }
      settled = true;
      reject(err);
    });
    child.once("close", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(code ?? 1);
    });
  });
  const close = () => {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  };
  return { wait, close };
};
var createSshTunnelOpener = (spawnFn = import_child_process.spawn) => ({
  open: (request) => openSshTunnel(request, spawnFn)
});

// src/bin.ts
var LOOPBACK_HOSTS = /* @__PURE__ */ new Set(["localhost", "127.0.0.1", "::1"]);
var runTunnel = async (parsed) => {
  const rawTarget = parsed.target?.trim();
  if (!rawTarget || !isValidTarget(rawTarget)) {
    logger.error("Missing SSH target. Usage: reditor tunnel <user@host> [--port 8080]");
    process.exit(1);
  }
  const localPort = Number(parsed.opts.port);
  if (!isValidPort(localPort)) {
    logger.error("Invalid local port", { port: parsed.opts.port });
    process.exit(1);
  }
  const remotePort = Number(parsed.opts.remotePort);
  if (!isValidPort(remotePort)) {
    logger.error("Invalid remote port", { remotePort: parsed.opts.remotePort });
    process.exit(1);
  }
  process.stdout.write("\n");
  process.stdout.write("  \u{1F687} SSH tunnel\n");
  process.stdout.write(`     https://localhost:${localPort}  \u2192  ${rawTarget}:${remotePort}
`);
  process.stdout.write(
    "     Leave this running. Restart serve on the server without resetting the tunnel.\n"
  );
  process.stdout.write("\n");
  logger.info("Opening SSH tunnel", {
    target: rawTarget,
    localPort,
    remotePort,
    remoteHost: DEFAULT_TUNNEL_REMOTE_HOST
  });
  const tunnels = createSshTunnelOpener();
  const session = tunnels.open({
    target: rawTarget,
    localPort,
    remotePort,
    remoteHost: DEFAULT_TUNNEL_REMOTE_HOST
  });
  const stop = () => {
    session.close();
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  try {
    const code = await session.wait();
    process.exit(code);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    const code = err.code;
    if (code === "ENOENT") {
      logger.error("ssh executable not found on PATH");
    } else {
      logger.error("Failed to open SSH tunnel", { error: error.message, stack: error.stack });
    }
    process.exit(1);
  }
};
var runServe = async (parsed) => {
  const { opts, file: rawFile } = parsed;
  if (!rawFile) {
    logger.error("Missing required file path. Usage: reditor serve <file>");
    process.exit(1);
  }
  const files = createFileStore();
  const absoluteFile = import_path8.default.resolve(rawFile);
  const validation = files.validate(absoluteFile);
  if (!validation.ok) {
    const { error } = validation;
    if (error.kind === "NOT_FOUND") {
      if (opts.create) {
        const created = files.create(absoluteFile);
        if (!created.ok) {
          logger.error("Failed to create file", {
            file: absoluteFile,
            error: created.error.message
          });
          process.exit(1);
        }
        logger.info("File created", { file: absoluteFile });
      } else {
        const confirmed = await promptCreateFile(absoluteFile);
        if (!confirmed) {
          process.stdout.write("\n  Aborted.\n\n");
          process.exit(0);
        }
        const created = files.create(absoluteFile);
        if (!created.ok) {
          logger.error("Failed to create file", {
            file: absoluteFile,
            error: created.error.message
          });
          process.exit(1);
        }
        logger.info("File created", { file: absoluteFile });
      }
    } else {
      switch (error.kind) {
        case "IS_DIRECTORY":
          logger.error("Path points to a directory, not a file", { file: absoluteFile });
          break;
        case "TOO_LARGE":
          logger.error("File exceeds maximum size for editor", {
            file: absoluteFile,
            sizeBytes: error.sizeBytes,
            maxBytes: error.maxBytes
          });
          break;
        case "NOT_TEXT":
          logger.error("File is not readable as text (binary content detected)", {
            file: absoluteFile
          });
          break;
        case "READ_ERROR":
          logger.error("Could not read file", { file: absoluteFile, error: error.message });
          break;
        case "PATH_TRAVERSAL":
          logger.error("Path traversal detected", { file: absoluteFile });
          break;
      }
      process.exit(1);
    }
  }
  const port = Number(opts.port);
  if (!isValidPort(port)) {
    logger.error("Invalid port", { port: opts.port });
    process.exit(1);
  }
  const tokenTtl = Number(opts.tokenTtl);
  if (!Number.isFinite(tokenTtl) || tokenTtl <= 0) {
    logger.error("Invalid token TTL", { tokenTtl: opts.tokenTtl });
    process.exit(1);
  }
  const securityEnabled = !opts.forceDisableSecurity;
  const isForced = securityEnabled && opts.forceOtp !== void 0;
  const otp = securityEnabled ? opts.forceOtp ?? generateOtp() : void 0;
  if (opts.forceDisableSecurity) {
    logger.warn("--force-disable-security is active: OTP and JWT auth are DISABLED");
    process.stdout.write("\n");
    process.stdout.write("  \u26A0\uFE0F  WARNING: Security is DISABLED via --force-disable-security\n");
    process.stdout.write("     Anyone with network access to this server can read the file.\n");
    process.stdout.write("     Never use this flag in production or on untrusted networks.\n");
    process.stdout.write("\n");
  }
  if (otp) {
    logger.info("OTP generated for session", { forced: isForced });
  }
  let keyPair;
  if (securityEnabled) {
    keyPair = generateKeyPair();
    logger.info("Generated ephemeral RSA-2048 signing keys for this process");
  }
  const config = loadConfig({
    port,
    host: opts.host,
    securityEnabled,
    otp,
    tokenTtl,
    jwtPrivateKey: keyPair?.privateKey,
    jwtPublicKey: keyPair?.publicKey,
    file: absoluteFile
  });
  if (config.securityEnabled && otp) {
    logger.info("Security mode enabled", { tokenTtlSeconds: tokenTtl });
    if (isForced) {
      logger.warn("--force-otp is set; OTP is predictable and should never be used in production");
    }
    process.stdout.write("\n");
    process.stdout.write("  \u{1F510} Security enabled\n");
    process.stdout.write(`  \u{1F511} One-Time Password: ${otp}
`);
    process.stdout.write(`  \u23F1  Token TTL: ${tokenTtl}s
`);
    process.stdout.write('     POST /auth/exchange-token with { "otp": "<code>" } to get a JWT.\n');
    if (!LOOPBACK_HOSTS.has(opts.host)) {
      logger.warn("Non-loopback bind: 3 failed OTP attempts will shut down the process", {
        host: opts.host
      });
      process.stdout.write(
        `  \u26A0\uFE0F  Bound to ${opts.host}: 3 failed OTP attempts will shut down the server.
`
      );
    }
    process.stdout.write("\n");
  }
  logger.info("Starting reditor server", {
    host: config.host,
    port: config.port,
    useTls: config.useTls,
    file: config.file,
    logFilePath
  });
  await startServer({
    config,
    logger,
    files,
    tokens: createTokenService()
  });
};
async function main() {
  const parsed = parseCli(process.argv);
  if (parsed.command === "tunnel") {
    await runTunnel(parsed);
    return;
  }
  await runServe(parsed);
}
main().catch((err) => {
  logger.error("Failed to start", { error: err.message, stack: err.stack });
  process.exit(1);
});
