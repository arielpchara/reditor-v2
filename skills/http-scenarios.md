# Skill: http-scenarios

## Purpose

Whenever an HTTP endpoint is created or modified, write (or update) a `.http` scenario file in the `rest/` directory at the project root — one file per controller/handler group. These files serve as living documentation and can be executed directly in VS Code with the [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) extension.

---

## When to activate this skill

Activate when:

- A new HTTP endpoint (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) is added
- An existing endpoint's path, method, request body, or response shape changes
- A new controller/handler file is created in `src/adapters/http/`
- An endpoint is removed (delete the scenario from the file or remove the file)

---

## File layout rules

```
rest/
├── health.http        # one file per controller group
├── auth.http
└── files.http         # future: file editing endpoints
```

**Naming:** match the controller/handler group name.  
- `src/adapters/http/handlers.ts` → `rest/health.http`  
- `src/adapters/http/authHandlers.ts` → `rest/auth.http`  
- `src/adapters/http/<domain>Handlers.ts` → `rest/<domain>.http`

---

## How to execute this skill

### Step 1 — Identify the controller

Determine which handler file owns the new/changed endpoint:
- `src/adapters/http/handlers.ts` → `rest/health.http`
- `src/adapters/http/authHandlers.ts` → `rest/auth.http`
- New handler file `src/adapters/http/<domain>Handlers.ts` → create `rest/<domain>.http`

### Step 2 — Write (or update) the `.http` file

#### File header

Every `.http` file must start with:

```http
# <group name> — reditor HTTP scenarios
# Base URL: update @host and @port to match your running server
# Use the REST Client VS Code extension to run these requests.

@host = localhost
@port = 3000
@baseUrl = http://{{host}}:{{port}}
```

If security is involved, add a token variable:

```http
@token = <paste JWT token here after calling /auth/exchange-token>
```

#### One scenario per endpoint

Each endpoint gets:
1. A `###` separator with a descriptive label
2. The HTTP method + path
3. Required headers
4. An example request body (for POST/PUT/PATCH)
5. A comment describing the expected response

**Format:**

```http
### <Scenario description>
# Expected: <status code> <brief description>
<METHOD> {{baseUrl}}/path
Content-Type: application/json
[Authorization: Bearer {{token}}]

{
  "field": "value"
}
```

#### Include both success and error scenarios

For each endpoint include:
- ✅ Happy path (valid inputs)
- ❌ At least one error case (wrong credentials, missing fields, etc.)

---

## Templates by endpoint type

### Health / status endpoint

```http
### Health check — server is running
# Expected: 200 {"status":"ok"}
GET {{baseUrl}}/health
```

### OTP exchange (auth)

```http
### Exchange OTP for JWT — valid OTP
# Expected: 200 {"token":"<JWT>","expiresIn":300}
POST {{baseUrl}}/auth/exchange-token
Content-Type: application/json

{
  "otp": "123456"
}

###

### Exchange OTP for JWT — wrong OTP
# Expected: 401 {"error":"Invalid OTP"}
POST {{baseUrl}}/auth/exchange-token
Content-Type: application/json

{
  "otp": "000000"
}

###

### Exchange OTP for JWT — missing OTP
# Expected: 401 {"error":"Invalid OTP"}
POST {{baseUrl}}/auth/exchange-token
Content-Type: application/json

{}
```

### Authenticated endpoint (uses JWT)

```http
### <Description> — authenticated
# Expected: 200 <describe response>
GET {{baseUrl}}/some/resource
Authorization: Bearer {{token}}
```

---

## Quality rules

- Every `.http` file must have a valid file header with `@host`, `@port`, `@baseUrl`
- Scenarios must have a `### label` separator and a `# Expected:` comment
- Never hardcode secrets — use `@token` variable that the user fills in
- Keep one `.http` file per handler group — do not mix unrelated endpoints
- If an endpoint is removed, remove its scenario from the file; if the file becomes empty, delete it
- Keep scenarios in the same order as the routes are registered in `routes.ts`

---

## Running scenarios

Install the [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) VS Code extension, then click **Send Request** above any scenario.

> ⚠️ When using self-signed TLS, add `"rest-client.enableTelemetry": false` and disable certificate verification in VS Code settings:
> `"rest-client.excludeHostsForProxy": []` and trust the self-signed cert, or set `"rest-client.validationCertificate": false`.
