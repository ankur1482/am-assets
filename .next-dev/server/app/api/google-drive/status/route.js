/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/google-drive/status/route";
exports.ids = ["app/api/google-drive/status/route"];
exports.modules = {

/***/ "(rsc)/./app/api/google-drive/status/route.ts":
/*!**********************************************!*\
  !*** ./app/api/google-drive/status/route.ts ***!
  \**********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   DELETE: () => (/* binding */ DELETE),\n/* harmony export */   GET: () => (/* binding */ GET),\n/* harmony export */   runtime: () => (/* binding */ runtime)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n/* harmony import */ var _lib_googleDriveOAuth__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/lib/googleDriveOAuth */ \"(rsc)/./lib/googleDriveOAuth.ts\");\n\n\nconst runtime = 'nodejs';\nasync function GET(req) {\n    return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n        connected: (0,_lib_googleDriveOAuth__WEBPACK_IMPORTED_MODULE_1__.hasGoogleDriveOAuth)(req)\n    });\n}\nasync function DELETE() {\n    const res = next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n        ok: true\n    });\n    res.cookies.set(_lib_googleDriveOAuth__WEBPACK_IMPORTED_MODULE_1__.GOOGLE_DRIVE_TOKEN_COOKIE, '', (0,_lib_googleDriveOAuth__WEBPACK_IMPORTED_MODULE_1__.clearGoogleOAuthCookieOptions)());\n    return res;\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXBpL2dvb2dsZS1kcml2ZS9zdGF0dXMvcm91dGUudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBcUQ7QUFDOEQ7QUFFNUcsTUFBTUksVUFBUSxTQUFTO0FBRXZCLGVBQWVDLElBQUlDLEdBQWU7SUFDdkMsT0FBT04scURBQVlBLENBQUNPLElBQUksQ0FBQztRQUFDQyxXQUFVTCwwRUFBbUJBLENBQUNHO0lBQUk7QUFDOUQ7QUFFTyxlQUFlRztJQUNwQixNQUFNQyxNQUFJVixxREFBWUEsQ0FBQ08sSUFBSSxDQUFDO1FBQUNJLElBQUc7SUFBSTtJQUNwQ0QsSUFBSUUsT0FBTyxDQUFDQyxHQUFHLENBQUNaLDRFQUF5QkEsRUFBQyxJQUFHQyxvRkFBNkJBO0lBQzFFLE9BQU9RO0FBQ1QiLCJzb3VyY2VzIjpbIkQ6XFxhc3NldC1tYW5hZ2VyLXZlcmNlbC1zdXBhYmFzZVxcYXBwXFxhcGlcXGdvb2dsZS1kcml2ZVxcc3RhdHVzXFxyb3V0ZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge05leHRSZXF1ZXN0LE5leHRSZXNwb25zZX0gZnJvbSAnbmV4dC9zZXJ2ZXInO1xuaW1wb3J0IHtHT09HTEVfRFJJVkVfVE9LRU5fQ09PS0lFLGNsZWFyR29vZ2xlT0F1dGhDb29raWVPcHRpb25zLGhhc0dvb2dsZURyaXZlT0F1dGh9IGZyb20gJ0AvbGliL2dvb2dsZURyaXZlT0F1dGgnO1xuXG5leHBvcnQgY29uc3QgcnVudGltZT0nbm9kZWpzJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIEdFVChyZXE6TmV4dFJlcXVlc3Qpe1xuICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oe2Nvbm5lY3RlZDpoYXNHb29nbGVEcml2ZU9BdXRoKHJlcSl9KTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIERFTEVURSgpe1xuICBjb25zdCByZXM9TmV4dFJlc3BvbnNlLmpzb24oe29rOnRydWV9KTtcbiAgcmVzLmNvb2tpZXMuc2V0KEdPT0dMRV9EUklWRV9UT0tFTl9DT09LSUUsJycsY2xlYXJHb29nbGVPQXV0aENvb2tpZU9wdGlvbnMoKSk7XG4gIHJldHVybiByZXM7XG59XG4iXSwibmFtZXMiOlsiTmV4dFJlc3BvbnNlIiwiR09PR0xFX0RSSVZFX1RPS0VOX0NPT0tJRSIsImNsZWFyR29vZ2xlT0F1dGhDb29raWVPcHRpb25zIiwiaGFzR29vZ2xlRHJpdmVPQXV0aCIsInJ1bnRpbWUiLCJHRVQiLCJyZXEiLCJqc29uIiwiY29ubmVjdGVkIiwiREVMRVRFIiwicmVzIiwib2siLCJjb29raWVzIiwic2V0Il0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./app/api/google-drive/status/route.ts\n");

/***/ }),

/***/ "(rsc)/./lib/googleDriveOAuth.ts":
/*!*********************************!*\
  !*** ./lib/googleDriveOAuth.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   GOOGLE_DRIVE_STATE_COOKIE: () => (/* binding */ GOOGLE_DRIVE_STATE_COOKIE),\n/* harmony export */   GOOGLE_DRIVE_TOKEN_COOKIE: () => (/* binding */ GOOGLE_DRIVE_TOKEN_COOKIE),\n/* harmony export */   clearGoogleOAuthCookieOptions: () => (/* binding */ clearGoogleOAuthCookieOptions),\n/* harmony export */   deleteOAuthAssetDocument: () => (/* binding */ deleteOAuthAssetDocument),\n/* harmony export */   downloadOAuthAssetDocument: () => (/* binding */ downloadOAuthAssetDocument),\n/* harmony export */   getGoogleOAuthClient: () => (/* binding */ getGoogleOAuthClient),\n/* harmony export */   googleOAuthCookieOptions: () => (/* binding */ googleOAuthCookieOptions),\n/* harmony export */   hasGoogleDriveOAuth: () => (/* binding */ hasGoogleDriveOAuth),\n/* harmony export */   makeGoogleDriveAuthUrl: () => (/* binding */ makeGoogleDriveAuthUrl),\n/* harmony export */   packGoogleTokens: () => (/* binding */ packGoogleTokens),\n/* harmony export */   readGoogleTokens: () => (/* binding */ readGoogleTokens),\n/* harmony export */   uploadOAuthAssetDocument: () => (/* binding */ uploadOAuthAssetDocument)\n/* harmony export */ });\n/* harmony import */ var stream__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! stream */ \"stream\");\n/* harmony import */ var stream__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(stream__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var crypto__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! crypto */ \"crypto\");\n/* harmony import */ var crypto__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(crypto__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var googleapis__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! googleapis */ \"(rsc)/./node_modules/googleapis/build/src/index.js\");\n\n\n\nconst FOLDER_MIME = 'application/vnd.google-apps.folder';\nconst DRIVE_PREFIX = 'gdrive:';\nconst GOOGLE_DRIVE_TOKEN_COOKIE = 'am_google_drive_tokens';\nconst GOOGLE_DRIVE_STATE_COOKIE = 'am_google_drive_state';\nconst APP_FOLDER_NAME = 'Important Documents';\nconst MODULE_FOLDER_NAMES = {\n    stocks: 'Stocks',\n    mutualFunds: 'Mutual Funds',\n    ulips: 'ULIPs',\n    bullion: 'Bullion',\n    nsel: 'NSEL e-Series',\n    fixedIncome: 'Fixed Income',\n    insurance: 'Insurance',\n    property: 'Property',\n    otherAssets: 'Other Assets',\n    loans: 'Loans',\n    borrowings: 'Borrowings',\n    goals: 'Goals',\n    watchlist: 'Watchlist',\n    alerts: 'Alerts',\n    documents: 'Documents'\n};\nfunction cleanName(value) {\n    return value.replace(/[<>:\"/\\\\|?*\\u0000-\\u001F]+/g, '_').replace(/\\s+/g, ' ').trim() || 'Document';\n}\nfunction escapeDriveQuery(value) {\n    return value.replace(/\\\\/g, '\\\\\\\\').replace(/'/g, \"\\\\'\");\n}\nfunction googleDriveFileId(path) {\n    return String(path || '').startsWith(DRIVE_PREFIX) ? path.slice(DRIVE_PREFIX.length) : path;\n}\nfunction cookieSecret() {\n    const secret = process.env.GOOGLE_OAUTH_COOKIE_SECRET || process.env.NEXTAUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.GOOGLE_OAUTH_CLIENT_SECRET;\n    if (!secret) throw new Error('Missing GOOGLE_OAUTH_COOKIE_SECRET. Add a long random value to .env.local.');\n    return crypto__WEBPACK_IMPORTED_MODULE_1___default().createHash('sha256').update(secret).digest();\n}\nfunction encryptJson(value) {\n    const iv = crypto__WEBPACK_IMPORTED_MODULE_1___default().randomBytes(12), cipher = crypto__WEBPACK_IMPORTED_MODULE_1___default().createCipheriv('aes-256-gcm', cookieSecret(), iv);\n    const body = Buffer.concat([\n        cipher.update(JSON.stringify(value), 'utf8'),\n        cipher.final()\n    ]);\n    const tag = cipher.getAuthTag();\n    return Buffer.concat([\n        iv,\n        tag,\n        body\n    ]).toString('base64url');\n}\nfunction decryptJson(value) {\n    const raw = Buffer.from(value, 'base64url'), iv = raw.subarray(0, 12), tag = raw.subarray(12, 28), body = raw.subarray(28);\n    const decipher = crypto__WEBPACK_IMPORTED_MODULE_1___default().createDecipheriv('aes-256-gcm', cookieSecret(), iv);\n    decipher.setAuthTag(tag);\n    return JSON.parse(Buffer.concat([\n        decipher.update(body),\n        decipher.final()\n    ]).toString('utf8'));\n}\nfunction googleOAuthCookieOptions(maxAge = 60 * 60 * 24 * 180) {\n    return {\n        httpOnly: true,\n        sameSite: 'lax',\n        secure: \"development\" === 'production',\n        path: '/',\n        maxAge\n    };\n}\nfunction clearGoogleOAuthCookieOptions() {\n    return {\n        httpOnly: true,\n        sameSite: 'lax',\n        secure: \"development\" === 'production',\n        path: '/',\n        maxAge: 0\n    };\n}\nfunction oauthConfig(req) {\n    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;\n    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;\n    if (!clientId || !clientSecret) throw new Error('Missing Google OAuth credentials. Add GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET to .env.local.');\n    const origin = req?.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';\n    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || `${origin}/api/google-drive/callback`;\n    return {\n        clientId,\n        clientSecret,\n        redirectUri\n    };\n}\nfunction getGoogleOAuthClient(req) {\n    const { clientId, clientSecret, redirectUri } = oauthConfig(req);\n    return new googleapis__WEBPACK_IMPORTED_MODULE_2__.google.auth.OAuth2(clientId, clientSecret, redirectUri);\n}\nfunction makeGoogleDriveAuthUrl(req, state) {\n    const client = getGoogleOAuthClient(req);\n    return client.generateAuthUrl({\n        access_type: 'offline',\n        prompt: 'consent',\n        state,\n        scope: [\n            'https://www.googleapis.com/auth/drive'\n        ]\n    });\n}\nfunction packGoogleTokens(tokens) {\n    return encryptJson(tokens);\n}\nfunction readGoogleTokens(req) {\n    const value = req.cookies.get(GOOGLE_DRIVE_TOKEN_COOKIE)?.value;\n    if (!value) return null;\n    try {\n        return decryptJson(value);\n    } catch  {\n        return null;\n    }\n}\nfunction hasGoogleDriveOAuth(req) {\n    const tokens = readGoogleTokens(req);\n    return !!tokens?.refresh_token || !!tokens?.access_token;\n}\nasync function getOAuthDrive(req) {\n    const tokens = readGoogleTokens(req);\n    if (!tokens?.refresh_token && !tokens?.access_token) throw new Error('Google Drive is not connected. Connect Google Drive and try again.');\n    const auth = getGoogleOAuthClient(req);\n    auth.setCredentials(tokens);\n    return googleapis__WEBPACK_IMPORTED_MODULE_2__.google.drive({\n        version: 'v3',\n        auth\n    });\n}\nasync function ensureFolder(drive, parentId, name) {\n    const safeName = cleanName(name);\n    const q = [\n        `mimeType='${FOLDER_MIME}'`,\n        `name='${escapeDriveQuery(safeName)}'`,\n        `'${parentId}' in parents`,\n        'trashed=false'\n    ].join(' and ');\n    const existing = await drive.files.list({\n        q,\n        fields: 'files(id,name)',\n        pageSize: 1\n    });\n    const found = existing.data.files?.[0]?.id;\n    if (found) return found;\n    const created = await drive.files.create({\n        requestBody: {\n            name: safeName,\n            mimeType: FOLDER_MIME,\n            parents: [\n                parentId\n            ]\n        },\n        fields: 'id'\n    });\n    if (!created.data.id) throw new Error(`Could not create Google Drive folder ${safeName}`);\n    return created.data.id;\n}\nasync function uploadOAuthAssetDocument(req, input) {\n    const drive = await getOAuthDrive(req);\n    let rootFolder = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '';\n    if (rootFolder) await drive.files.get({\n        fileId: rootFolder,\n        fields: 'id,name'\n    });\n    else rootFolder = await ensureFolder(drive, 'root', APP_FOLDER_NAME);\n    let moduleFolder = rootFolder;\n    const parts = (input.folderParts?.length ? input.folderParts : [\n        MODULE_FOLDER_NAMES[input.moduleKey] || input.moduleKey || 'Documents'\n    ]).map(cleanName).filter(Boolean);\n    for (const part of parts)moduleFolder = await ensureFolder(drive, moduleFolder, part);\n    const fileName = cleanName(`${new Date().toISOString().replace(/[:.]/g, '-')} ${input.fileName}`);\n    const uploaded = await drive.files.create({\n        requestBody: {\n            name: fileName,\n            parents: [\n                moduleFolder\n            ]\n        },\n        media: {\n            mimeType: input.mimeType || 'application/octet-stream',\n            body: stream__WEBPACK_IMPORTED_MODULE_0__.Readable.from(input.buffer)\n        },\n        fields: 'id,name,mimeType,size,webViewLink,webContentLink'\n    });\n    if (!uploaded.data.id) throw new Error('Google Drive upload did not return a file ID');\n    return {\n        fileId: uploaded.data.id,\n        fileName: uploaded.data.name || input.fileName,\n        folderId: moduleFolder,\n        webViewLink: uploaded.data.webViewLink || '',\n        webContentLink: uploaded.data.webContentLink || ''\n    };\n}\nasync function downloadOAuthAssetDocument(req, filePath) {\n    const drive = await getOAuthDrive(req);\n    const fileId = googleDriveFileId(filePath);\n    const [meta, content] = await Promise.all([\n        drive.files.get({\n            fileId,\n            fields: 'name,mimeType,size'\n        }),\n        drive.files.get({\n            fileId,\n            alt: 'media'\n        }, {\n            responseType: 'arraybuffer'\n        })\n    ]);\n    return {\n        name: meta.data.name || 'document',\n        mimeType: meta.data.mimeType || 'application/octet-stream',\n        body: Buffer.from(content.data)\n    };\n}\nasync function deleteOAuthAssetDocument(req, filePath) {\n    const drive = await getOAuthDrive(req);\n    await drive.files.delete({\n        fileId: googleDriveFileId(filePath)\n    });\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,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Z29vZ2xlRHJpdmVPQXV0aC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1JlYWRhYmxlfSBmcm9tICdzdHJlYW0nO1xuaW1wb3J0IGNyeXB0byBmcm9tICdjcnlwdG8nO1xuaW1wb3J0IHtnb29nbGV9IGZyb20gJ2dvb2dsZWFwaXMnO1xuaW1wb3J0IHR5cGUge05leHRSZXF1ZXN0fSBmcm9tICduZXh0L3NlcnZlcic7XG5cbmNvbnN0IEZPTERFUl9NSU1FPSdhcHBsaWNhdGlvbi92bmQuZ29vZ2xlLWFwcHMuZm9sZGVyJztcbmNvbnN0IERSSVZFX1BSRUZJWD0nZ2RyaXZlOic7XG5leHBvcnQgY29uc3QgR09PR0xFX0RSSVZFX1RPS0VOX0NPT0tJRT0nYW1fZ29vZ2xlX2RyaXZlX3Rva2Vucyc7XG5leHBvcnQgY29uc3QgR09PR0xFX0RSSVZFX1NUQVRFX0NPT0tJRT0nYW1fZ29vZ2xlX2RyaXZlX3N0YXRlJztcbmNvbnN0IEFQUF9GT0xERVJfTkFNRT0nSW1wb3J0YW50IERvY3VtZW50cyc7XG5jb25zdCBNT0RVTEVfRk9MREVSX05BTUVTOlJlY29yZDxzdHJpbmcsc3RyaW5nPj17XG4gIHN0b2NrczonU3RvY2tzJyxcbiAgbXV0dWFsRnVuZHM6J011dHVhbCBGdW5kcycsXG4gIHVsaXBzOidVTElQcycsXG4gIGJ1bGxpb246J0J1bGxpb24nLFxuICBuc2VsOidOU0VMIGUtU2VyaWVzJyxcbiAgZml4ZWRJbmNvbWU6J0ZpeGVkIEluY29tZScsXG4gIGluc3VyYW5jZTonSW5zdXJhbmNlJyxcbiAgcHJvcGVydHk6J1Byb3BlcnR5JyxcbiAgb3RoZXJBc3NldHM6J090aGVyIEFzc2V0cycsXG4gIGxvYW5zOidMb2FucycsXG4gIGJvcnJvd2luZ3M6J0JvcnJvd2luZ3MnLFxuICBnb2FsczonR29hbHMnLFxuICB3YXRjaGxpc3Q6J1dhdGNobGlzdCcsXG4gIGFsZXJ0czonQWxlcnRzJyxcbiAgZG9jdW1lbnRzOidEb2N1bWVudHMnXG59O1xuXG50eXBlIERyaXZlVXBsb2FkSW5wdXQ9e1xuICB1c2VySWQ6c3RyaW5nO1xuICBtb2R1bGVLZXk6c3RyaW5nO1xuICBmaWxlTmFtZTpzdHJpbmc7XG4gIG1pbWVUeXBlOnN0cmluZztcbiAgYnVmZmVyOkJ1ZmZlcjtcbiAgZm9sZGVyUGFydHM/OnN0cmluZ1tdO1xufTtcblxuZnVuY3Rpb24gY2xlYW5OYW1lKHZhbHVlOnN0cmluZyl7XG4gIHJldHVybiB2YWx1ZS5yZXBsYWNlKC9bPD46XCIvXFxcXHw/KlxcdTAwMDAtXFx1MDAxRl0rL2csJ18nKS5yZXBsYWNlKC9cXHMrL2csJyAnKS50cmltKCl8fCdEb2N1bWVudCc7XG59XG5cbmZ1bmN0aW9uIGVzY2FwZURyaXZlUXVlcnkodmFsdWU6c3RyaW5nKXtcbiAgcmV0dXJuIHZhbHVlLnJlcGxhY2UoL1xcXFwvZywnXFxcXFxcXFwnKS5yZXBsYWNlKC8nL2csXCJcXFxcJ1wiKTtcbn1cblxuZnVuY3Rpb24gZ29vZ2xlRHJpdmVGaWxlSWQocGF0aDpzdHJpbmcpe1xuICByZXR1cm4gU3RyaW5nKHBhdGh8fCcnKS5zdGFydHNXaXRoKERSSVZFX1BSRUZJWCk/cGF0aC5zbGljZShEUklWRV9QUkVGSVgubGVuZ3RoKTpwYXRoO1xufVxuXG5mdW5jdGlvbiBjb29raWVTZWNyZXQoKXtcbiAgY29uc3Qgc2VjcmV0PXByb2Nlc3MuZW52LkdPT0dMRV9PQVVUSF9DT09LSUVfU0VDUkVUfHxwcm9jZXNzLmVudi5ORVhUQVVUSF9TRUNSRVR8fHByb2Nlc3MuZW52LlNVUEFCQVNFX1NFUlZJQ0VfUk9MRV9LRVl8fHByb2Nlc3MuZW52LkdPT0dMRV9PQVVUSF9DTElFTlRfU0VDUkVUO1xuICBpZighc2VjcmV0KXRocm93IG5ldyBFcnJvcignTWlzc2luZyBHT09HTEVfT0FVVEhfQ09PS0lFX1NFQ1JFVC4gQWRkIGEgbG9uZyByYW5kb20gdmFsdWUgdG8gLmVudi5sb2NhbC4nKTtcbiAgcmV0dXJuIGNyeXB0by5jcmVhdGVIYXNoKCdzaGEyNTYnKS51cGRhdGUoc2VjcmV0KS5kaWdlc3QoKTtcbn1cblxuZnVuY3Rpb24gZW5jcnlwdEpzb24odmFsdWU6YW55KXtcbiAgY29uc3QgaXY9Y3J5cHRvLnJhbmRvbUJ5dGVzKDEyKSxjaXBoZXI9Y3J5cHRvLmNyZWF0ZUNpcGhlcml2KCdhZXMtMjU2LWdjbScsY29va2llU2VjcmV0KCksaXYpO1xuICBjb25zdCBib2R5PUJ1ZmZlci5jb25jYXQoW2NpcGhlci51cGRhdGUoSlNPTi5zdHJpbmdpZnkodmFsdWUpLCd1dGY4JyksY2lwaGVyLmZpbmFsKCldKTtcbiAgY29uc3QgdGFnPWNpcGhlci5nZXRBdXRoVGFnKCk7XG4gIHJldHVybiBCdWZmZXIuY29uY2F0KFtpdix0YWcsYm9keV0pLnRvU3RyaW5nKCdiYXNlNjR1cmwnKTtcbn1cblxuZnVuY3Rpb24gZGVjcnlwdEpzb24odmFsdWU6c3RyaW5nKXtcbiAgY29uc3QgcmF3PUJ1ZmZlci5mcm9tKHZhbHVlLCdiYXNlNjR1cmwnKSxpdj1yYXcuc3ViYXJyYXkoMCwxMiksdGFnPXJhdy5zdWJhcnJheSgxMiwyOCksYm9keT1yYXcuc3ViYXJyYXkoMjgpO1xuICBjb25zdCBkZWNpcGhlcj1jcnlwdG8uY3JlYXRlRGVjaXBoZXJpdignYWVzLTI1Ni1nY20nLGNvb2tpZVNlY3JldCgpLGl2KTtcbiAgZGVjaXBoZXIuc2V0QXV0aFRhZyh0YWcpO1xuICByZXR1cm4gSlNPTi5wYXJzZShCdWZmZXIuY29uY2F0KFtkZWNpcGhlci51cGRhdGUoYm9keSksZGVjaXBoZXIuZmluYWwoKV0pLnRvU3RyaW5nKCd1dGY4JykpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ29vZ2xlT0F1dGhDb29raWVPcHRpb25zKG1heEFnZT02MCo2MCoyNCoxODApe1xuICByZXR1cm4ge2h0dHBPbmx5OnRydWUsc2FtZVNpdGU6J2xheCcgYXMgY29uc3Qsc2VjdXJlOnByb2Nlc3MuZW52Lk5PREVfRU5WPT09J3Byb2R1Y3Rpb24nLHBhdGg6Jy8nLG1heEFnZX07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjbGVhckdvb2dsZU9BdXRoQ29va2llT3B0aW9ucygpe1xuICByZXR1cm4ge2h0dHBPbmx5OnRydWUsc2FtZVNpdGU6J2xheCcgYXMgY29uc3Qsc2VjdXJlOnByb2Nlc3MuZW52Lk5PREVfRU5WPT09J3Byb2R1Y3Rpb24nLHBhdGg6Jy8nLG1heEFnZTowfTtcbn1cblxuZnVuY3Rpb24gb2F1dGhDb25maWcocmVxPzpOZXh0UmVxdWVzdCl7XG4gIGNvbnN0IGNsaWVudElkPXByb2Nlc3MuZW52LkdPT0dMRV9PQVVUSF9DTElFTlRfSUQ7XG4gIGNvbnN0IGNsaWVudFNlY3JldD1wcm9jZXNzLmVudi5HT09HTEVfT0FVVEhfQ0xJRU5UX1NFQ1JFVDtcbiAgaWYoIWNsaWVudElkfHwhY2xpZW50U2VjcmV0KXRocm93IG5ldyBFcnJvcignTWlzc2luZyBHb29nbGUgT0F1dGggY3JlZGVudGlhbHMuIEFkZCBHT09HTEVfT0FVVEhfQ0xJRU5UX0lEIGFuZCBHT09HTEVfT0FVVEhfQ0xJRU5UX1NFQ1JFVCB0byAuZW52LmxvY2FsLicpO1xuICBjb25zdCBvcmlnaW49cmVxPy5uZXh0VXJsLm9yaWdpbnx8cHJvY2Vzcy5lbnYuTkVYVF9QVUJMSUNfQVBQX1VSTHx8J2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCc7XG4gIGNvbnN0IHJlZGlyZWN0VXJpPXByb2Nlc3MuZW52LkdPT0dMRV9PQVVUSF9SRURJUkVDVF9VUkl8fGAke29yaWdpbn0vYXBpL2dvb2dsZS1kcml2ZS9jYWxsYmFja2A7XG4gIHJldHVybiB7Y2xpZW50SWQsY2xpZW50U2VjcmV0LHJlZGlyZWN0VXJpfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEdvb2dsZU9BdXRoQ2xpZW50KHJlcT86TmV4dFJlcXVlc3Qpe1xuICBjb25zdCB7Y2xpZW50SWQsY2xpZW50U2VjcmV0LHJlZGlyZWN0VXJpfT1vYXV0aENvbmZpZyhyZXEpO1xuICByZXR1cm4gbmV3IGdvb2dsZS5hdXRoLk9BdXRoMihjbGllbnRJZCxjbGllbnRTZWNyZXQscmVkaXJlY3RVcmkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWFrZUdvb2dsZURyaXZlQXV0aFVybChyZXE6TmV4dFJlcXVlc3Qsc3RhdGU6c3RyaW5nKXtcbiAgY29uc3QgY2xpZW50PWdldEdvb2dsZU9BdXRoQ2xpZW50KHJlcSk7XG4gIHJldHVybiBjbGllbnQuZ2VuZXJhdGVBdXRoVXJsKHtcbiAgICBhY2Nlc3NfdHlwZTonb2ZmbGluZScsXG4gICAgcHJvbXB0Oidjb25zZW50JyxcbiAgICBzdGF0ZSxcbiAgICBzY29wZTpbJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2F1dGgvZHJpdmUnXVxuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhY2tHb29nbGVUb2tlbnModG9rZW5zOmFueSl7XG4gIHJldHVybiBlbmNyeXB0SnNvbih0b2tlbnMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZEdvb2dsZVRva2VucyhyZXE6TmV4dFJlcXVlc3Qpe1xuICBjb25zdCB2YWx1ZT1yZXEuY29va2llcy5nZXQoR09PR0xFX0RSSVZFX1RPS0VOX0NPT0tJRSk/LnZhbHVlO1xuICBpZighdmFsdWUpcmV0dXJuIG51bGw7XG4gIHRyeXtyZXR1cm4gZGVjcnlwdEpzb24odmFsdWUpfWNhdGNoe3JldHVybiBudWxsfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gaGFzR29vZ2xlRHJpdmVPQXV0aChyZXE6TmV4dFJlcXVlc3Qpe1xuICBjb25zdCB0b2tlbnM9cmVhZEdvb2dsZVRva2VucyhyZXEpO1xuICByZXR1cm4gISF0b2tlbnM/LnJlZnJlc2hfdG9rZW58fCEhdG9rZW5zPy5hY2Nlc3NfdG9rZW47XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGdldE9BdXRoRHJpdmUocmVxOk5leHRSZXF1ZXN0KXtcbiAgY29uc3QgdG9rZW5zPXJlYWRHb29nbGVUb2tlbnMocmVxKTtcbiAgaWYoIXRva2Vucz8ucmVmcmVzaF90b2tlbiYmIXRva2Vucz8uYWNjZXNzX3Rva2VuKXRocm93IG5ldyBFcnJvcignR29vZ2xlIERyaXZlIGlzIG5vdCBjb25uZWN0ZWQuIENvbm5lY3QgR29vZ2xlIERyaXZlIGFuZCB0cnkgYWdhaW4uJyk7XG4gIGNvbnN0IGF1dGg9Z2V0R29vZ2xlT0F1dGhDbGllbnQocmVxKTtcbiAgYXV0aC5zZXRDcmVkZW50aWFscyh0b2tlbnMpO1xuICByZXR1cm4gZ29vZ2xlLmRyaXZlKHt2ZXJzaW9uOid2MycsYXV0aH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBlbnN1cmVGb2xkZXIoZHJpdmU6UmV0dXJuVHlwZTx0eXBlb2YgZ29vZ2xlLmRyaXZlPixwYXJlbnRJZDpzdHJpbmcsbmFtZTpzdHJpbmcpe1xuICBjb25zdCBzYWZlTmFtZT1jbGVhbk5hbWUobmFtZSk7XG4gIGNvbnN0IHE9W1xuICAgIGBtaW1lVHlwZT0nJHtGT0xERVJfTUlNRX0nYCxcbiAgICBgbmFtZT0nJHtlc2NhcGVEcml2ZVF1ZXJ5KHNhZmVOYW1lKX0nYCxcbiAgICBgJyR7cGFyZW50SWR9JyBpbiBwYXJlbnRzYCxcbiAgICAndHJhc2hlZD1mYWxzZSdcbiAgXS5qb2luKCcgYW5kICcpO1xuICBjb25zdCBleGlzdGluZz1hd2FpdCBkcml2ZS5maWxlcy5saXN0KHtxLGZpZWxkczonZmlsZXMoaWQsbmFtZSknLHBhZ2VTaXplOjF9KTtcbiAgY29uc3QgZm91bmQ9ZXhpc3RpbmcuZGF0YS5maWxlcz8uWzBdPy5pZDtcbiAgaWYoZm91bmQpcmV0dXJuIGZvdW5kO1xuICBjb25zdCBjcmVhdGVkPWF3YWl0IGRyaXZlLmZpbGVzLmNyZWF0ZSh7XG4gICAgcmVxdWVzdEJvZHk6e25hbWU6c2FmZU5hbWUsbWltZVR5cGU6Rk9MREVSX01JTUUscGFyZW50czpbcGFyZW50SWRdfSxcbiAgICBmaWVsZHM6J2lkJ1xuICB9KTtcbiAgaWYoIWNyZWF0ZWQuZGF0YS5pZCl0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBjcmVhdGUgR29vZ2xlIERyaXZlIGZvbGRlciAke3NhZmVOYW1lfWApO1xuICByZXR1cm4gY3JlYXRlZC5kYXRhLmlkO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBsb2FkT0F1dGhBc3NldERvY3VtZW50KHJlcTpOZXh0UmVxdWVzdCxpbnB1dDpEcml2ZVVwbG9hZElucHV0KXtcbiAgY29uc3QgZHJpdmU9YXdhaXQgZ2V0T0F1dGhEcml2ZShyZXEpO1xuICBsZXQgcm9vdEZvbGRlcj1wcm9jZXNzLmVudi5HT09HTEVfRFJJVkVfUk9PVF9GT0xERVJfSUR8fCcnO1xuICBpZihyb290Rm9sZGVyKWF3YWl0IGRyaXZlLmZpbGVzLmdldCh7ZmlsZUlkOnJvb3RGb2xkZXIsZmllbGRzOidpZCxuYW1lJ30pO1xuICBlbHNlIHJvb3RGb2xkZXI9YXdhaXQgZW5zdXJlRm9sZGVyKGRyaXZlLCdyb290JyxBUFBfRk9MREVSX05BTUUpO1xuICBsZXQgbW9kdWxlRm9sZGVyPXJvb3RGb2xkZXI7XG4gIGNvbnN0IHBhcnRzPShpbnB1dC5mb2xkZXJQYXJ0cz8ubGVuZ3RoP2lucHV0LmZvbGRlclBhcnRzOltNT0RVTEVfRk9MREVSX05BTUVTW2lucHV0Lm1vZHVsZUtleV18fGlucHV0Lm1vZHVsZUtleXx8J0RvY3VtZW50cyddKS5tYXAoY2xlYW5OYW1lKS5maWx0ZXIoQm9vbGVhbik7XG4gIGZvcihjb25zdCBwYXJ0IG9mIHBhcnRzKW1vZHVsZUZvbGRlcj1hd2FpdCBlbnN1cmVGb2xkZXIoZHJpdmUsbW9kdWxlRm9sZGVyLHBhcnQpO1xuICBjb25zdCBmaWxlTmFtZT1jbGVhbk5hbWUoYCR7bmV3IERhdGUoKS50b0lTT1N0cmluZygpLnJlcGxhY2UoL1s6Ll0vZywnLScpfSAke2lucHV0LmZpbGVOYW1lfWApO1xuICBjb25zdCB1cGxvYWRlZD1hd2FpdCBkcml2ZS5maWxlcy5jcmVhdGUoe1xuICAgIHJlcXVlc3RCb2R5OntuYW1lOmZpbGVOYW1lLHBhcmVudHM6W21vZHVsZUZvbGRlcl19LFxuICAgIG1lZGlhOnttaW1lVHlwZTppbnB1dC5taW1lVHlwZXx8J2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbScsYm9keTpSZWFkYWJsZS5mcm9tKGlucHV0LmJ1ZmZlcil9LFxuICAgIGZpZWxkczonaWQsbmFtZSxtaW1lVHlwZSxzaXplLHdlYlZpZXdMaW5rLHdlYkNvbnRlbnRMaW5rJ1xuICB9KTtcbiAgaWYoIXVwbG9hZGVkLmRhdGEuaWQpdGhyb3cgbmV3IEVycm9yKCdHb29nbGUgRHJpdmUgdXBsb2FkIGRpZCBub3QgcmV0dXJuIGEgZmlsZSBJRCcpO1xuICByZXR1cm4ge1xuICAgIGZpbGVJZDp1cGxvYWRlZC5kYXRhLmlkLFxuICAgIGZpbGVOYW1lOnVwbG9hZGVkLmRhdGEubmFtZXx8aW5wdXQuZmlsZU5hbWUsXG4gICAgZm9sZGVySWQ6bW9kdWxlRm9sZGVyLFxuICAgIHdlYlZpZXdMaW5rOnVwbG9hZGVkLmRhdGEud2ViVmlld0xpbmt8fCcnLFxuICAgIHdlYkNvbnRlbnRMaW5rOnVwbG9hZGVkLmRhdGEud2ViQ29udGVudExpbmt8fCcnXG4gIH07XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkb3dubG9hZE9BdXRoQXNzZXREb2N1bWVudChyZXE6TmV4dFJlcXVlc3QsZmlsZVBhdGg6c3RyaW5nKXtcbiAgY29uc3QgZHJpdmU9YXdhaXQgZ2V0T0F1dGhEcml2ZShyZXEpO1xuICBjb25zdCBmaWxlSWQ9Z29vZ2xlRHJpdmVGaWxlSWQoZmlsZVBhdGgpO1xuICBjb25zdCBbbWV0YSxjb250ZW50XT1hd2FpdCBQcm9taXNlLmFsbChbXG4gICAgZHJpdmUuZmlsZXMuZ2V0KHtmaWxlSWQsZmllbGRzOiduYW1lLG1pbWVUeXBlLHNpemUnfSksXG4gICAgZHJpdmUuZmlsZXMuZ2V0KHtmaWxlSWQsYWx0OidtZWRpYSd9LHtyZXNwb25zZVR5cGU6J2FycmF5YnVmZmVyJ30gYXMgYW55KVxuICBdKTtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOm1ldGEuZGF0YS5uYW1lfHwnZG9jdW1lbnQnLFxuICAgIG1pbWVUeXBlOm1ldGEuZGF0YS5taW1lVHlwZXx8J2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbScsXG4gICAgYm9keTpCdWZmZXIuZnJvbShjb250ZW50LmRhdGEgYXMgdW5rbm93biBhcyBBcnJheUJ1ZmZlcilcbiAgfTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRlbGV0ZU9BdXRoQXNzZXREb2N1bWVudChyZXE6TmV4dFJlcXVlc3QsZmlsZVBhdGg6c3RyaW5nKXtcbiAgY29uc3QgZHJpdmU9YXdhaXQgZ2V0T0F1dGhEcml2ZShyZXEpO1xuICBhd2FpdCBkcml2ZS5maWxlcy5kZWxldGUoe2ZpbGVJZDpnb29nbGVEcml2ZUZpbGVJZChmaWxlUGF0aCl9KTtcbn1cbiJdLCJuYW1lcyI6WyJSZWFkYWJsZSIsImNyeXB0byIsImdvb2dsZSIsIkZPTERFUl9NSU1FIiwiRFJJVkVfUFJFRklYIiwiR09PR0xFX0RSSVZFX1RPS0VOX0NPT0tJRSIsIkdPT0dMRV9EUklWRV9TVEFURV9DT09LSUUiLCJBUFBfRk9MREVSX05BTUUiLCJNT0RVTEVfRk9MREVSX05BTUVTIiwic3RvY2tzIiwibXV0dWFsRnVuZHMiLCJ1bGlwcyIsImJ1bGxpb24iLCJuc2VsIiwiZml4ZWRJbmNvbWUiLCJpbnN1cmFuY2UiLCJwcm9wZXJ0eSIsIm90aGVyQXNzZXRzIiwibG9hbnMiLCJib3Jyb3dpbmdzIiwiZ29hbHMiLCJ3YXRjaGxpc3QiLCJhbGVydHMiLCJkb2N1bWVudHMiLCJjbGVhbk5hbWUiLCJ2YWx1ZSIsInJlcGxhY2UiLCJ0cmltIiwiZXNjYXBlRHJpdmVRdWVyeSIsImdvb2dsZURyaXZlRmlsZUlkIiwicGF0aCIsIlN0cmluZyIsInN0YXJ0c1dpdGgiLCJzbGljZSIsImxlbmd0aCIsImNvb2tpZVNlY3JldCIsInNlY3JldCIsInByb2Nlc3MiLCJlbnYiLCJHT09HTEVfT0FVVEhfQ09PS0lFX1NFQ1JFVCIsIk5FWFRBVVRIX1NFQ1JFVCIsIlNVUEFCQVNFX1NFUlZJQ0VfUk9MRV9LRVkiLCJHT09HTEVfT0FVVEhfQ0xJRU5UX1NFQ1JFVCIsIkVycm9yIiwiY3JlYXRlSGFzaCIsInVwZGF0ZSIsImRpZ2VzdCIsImVuY3J5cHRKc29uIiwiaXYiLCJyYW5kb21CeXRlcyIsImNpcGhlciIsImNyZWF0ZUNpcGhlcml2IiwiYm9keSIsIkJ1ZmZlciIsImNvbmNhdCIsIkpTT04iLCJzdHJpbmdpZnkiLCJmaW5hbCIsInRhZyIsImdldEF1dGhUYWciLCJ0b1N0cmluZyIsImRlY3J5cHRKc29uIiwicmF3IiwiZnJvbSIsInN1YmFycmF5IiwiZGVjaXBoZXIiLCJjcmVhdGVEZWNpcGhlcml2Iiwic2V0QXV0aFRhZyIsInBhcnNlIiwiZ29vZ2xlT0F1dGhDb29raWVPcHRpb25zIiwibWF4QWdlIiwiaHR0cE9ubHkiLCJzYW1lU2l0ZSIsInNlY3VyZSIsImNsZWFyR29vZ2xlT0F1dGhDb29raWVPcHRpb25zIiwib2F1dGhDb25maWciLCJyZXEiLCJjbGllbnRJZCIsIkdPT0dMRV9PQVVUSF9DTElFTlRfSUQiLCJjbGllbnRTZWNyZXQiLCJvcmlnaW4iLCJuZXh0VXJsIiwiTkVYVF9QVUJMSUNfQVBQX1VSTCIsInJlZGlyZWN0VXJpIiwiR09PR0xFX09BVVRIX1JFRElSRUNUX1VSSSIsImdldEdvb2dsZU9BdXRoQ2xpZW50IiwiYXV0aCIsIk9BdXRoMiIsIm1ha2VHb29nbGVEcml2ZUF1dGhVcmwiLCJzdGF0ZSIsImNsaWVudCIsImdlbmVyYXRlQXV0aFVybCIsImFjY2Vzc190eXBlIiwicHJvbXB0Iiwic2NvcGUiLCJwYWNrR29vZ2xlVG9rZW5zIiwidG9rZW5zIiwicmVhZEdvb2dsZVRva2VucyIsImNvb2tpZXMiLCJnZXQiLCJoYXNHb29nbGVEcml2ZU9BdXRoIiwicmVmcmVzaF90b2tlbiIsImFjY2Vzc190b2tlbiIsImdldE9BdXRoRHJpdmUiLCJzZXRDcmVkZW50aWFscyIsImRyaXZlIiwidmVyc2lvbiIsImVuc3VyZUZvbGRlciIsInBhcmVudElkIiwibmFtZSIsInNhZmVOYW1lIiwicSIsImpvaW4iLCJleGlzdGluZyIsImZpbGVzIiwibGlzdCIsImZpZWxkcyIsInBhZ2VTaXplIiwiZm91bmQiLCJkYXRhIiwiaWQiLCJjcmVhdGVkIiwiY3JlYXRlIiwicmVxdWVzdEJvZHkiLCJtaW1lVHlwZSIsInBhcmVudHMiLCJ1cGxvYWRPQXV0aEFzc2V0RG9jdW1lbnQiLCJpbnB1dCIsInJvb3RGb2xkZXIiLCJHT09HTEVfRFJJVkVfUk9PVF9GT0xERVJfSUQiLCJmaWxlSWQiLCJtb2R1bGVGb2xkZXIiLCJwYXJ0cyIsImZvbGRlclBhcnRzIiwibW9kdWxlS2V5IiwibWFwIiwiZmlsdGVyIiwiQm9vbGVhbiIsInBhcnQiLCJmaWxlTmFtZSIsIkRhdGUiLCJ0b0lTT1N0cmluZyIsInVwbG9hZGVkIiwibWVkaWEiLCJidWZmZXIiLCJmb2xkZXJJZCIsIndlYlZpZXdMaW5rIiwid2ViQ29udGVudExpbmsiLCJkb3dubG9hZE9BdXRoQXNzZXREb2N1bWVudCIsImZpbGVQYXRoIiwibWV0YSIsImNvbnRlbnQiLCJQcm9taXNlIiwiYWxsIiwiYWx0IiwicmVzcG9uc2VUeXBlIiwiZGVsZXRlT0F1dGhBc3NldERvY3VtZW50IiwiZGVsZXRlIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./lib/googleDriveOAuth.ts\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fgoogle-drive%2Fstatus%2Froute&page=%2Fapi%2Fgoogle-drive%2Fstatus%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fgoogle-drive%2Fstatus%2Froute.ts&appDir=D%3A%5Casset-manager-vercel-supabase%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=D%3A%5Casset-manager-vercel-supabase&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D&isGlobalNotFoundEnabled=!":
/*!**************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fgoogle-drive%2Fstatus%2Froute&page=%2Fapi%2Fgoogle-drive%2Fstatus%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fgoogle-drive%2Fstatus%2Froute.ts&appDir=D%3A%5Casset-manager-vercel-supabase%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=D%3A%5Casset-manager-vercel-supabase&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D&isGlobalNotFoundEnabled=! ***!
  \**************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   handler: () => (/* binding */ handler),\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   workAsyncStorage: () => (/* binding */ workAsyncStorage),\n/* harmony export */   workUnitAsyncStorage: () => (/* binding */ workUnitAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/route-kind */ \"(rsc)/./node_modules/next/dist/server/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! next/dist/server/request-meta */ \"(rsc)/./node_modules/next/dist/server/request-meta.js\");\n/* harmony import */ var next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_3__);\n/* harmony import */ var next_dist_server_lib_trace_tracer__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! next/dist/server/lib/trace/tracer */ \"(rsc)/./node_modules/next/dist/server/lib/trace/tracer.js\");\n/* harmony import */ var next_dist_server_lib_trace_tracer__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_trace_tracer__WEBPACK_IMPORTED_MODULE_4__);\n/* harmony import */ var next_dist_shared_lib_router_utils_app_paths__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! next/dist/shared/lib/router/utils/app-paths */ \"next/dist/shared/lib/router/utils/app-paths\");\n/* harmony import */ var next_dist_shared_lib_router_utils_app_paths__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(next_dist_shared_lib_router_utils_app_paths__WEBPACK_IMPORTED_MODULE_5__);\n/* harmony import */ var next_dist_server_base_http_node__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! next/dist/server/base-http/node */ \"(rsc)/./node_modules/next/dist/server/base-http/node.js\");\n/* harmony import */ var next_dist_server_base_http_node__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_base_http_node__WEBPACK_IMPORTED_MODULE_6__);\n/* harmony import */ var next_dist_server_web_spec_extension_adapters_next_request__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! next/dist/server/web/spec-extension/adapters/next-request */ \"(rsc)/./node_modules/next/dist/server/web/spec-extension/adapters/next-request.js\");\n/* harmony import */ var next_dist_server_web_spec_extension_adapters_next_request__WEBPACK_IMPORTED_MODULE_7___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_web_spec_extension_adapters_next_request__WEBPACK_IMPORTED_MODULE_7__);\n/* harmony import */ var next_dist_server_lib_trace_constants__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! next/dist/server/lib/trace/constants */ \"(rsc)/./node_modules/next/dist/server/lib/trace/constants.js\");\n/* harmony import */ var next_dist_server_lib_trace_constants__WEBPACK_IMPORTED_MODULE_8___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_trace_constants__WEBPACK_IMPORTED_MODULE_8__);\n/* harmony import */ var next_dist_server_instrumentation_utils__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! next/dist/server/instrumentation/utils */ \"(rsc)/./node_modules/next/dist/server/instrumentation/utils.js\");\n/* harmony import */ var next_dist_server_send_response__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! next/dist/server/send-response */ \"(rsc)/./node_modules/next/dist/server/send-response.js\");\n/* harmony import */ var next_dist_server_web_utils__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! next/dist/server/web/utils */ \"(rsc)/./node_modules/next/dist/server/web/utils.js\");\n/* harmony import */ var next_dist_server_web_utils__WEBPACK_IMPORTED_MODULE_11___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_web_utils__WEBPACK_IMPORTED_MODULE_11__);\n/* harmony import */ var next_dist_server_lib_cache_control__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! next/dist/server/lib/cache-control */ \"(rsc)/./node_modules/next/dist/server/lib/cache-control.js\");\n/* harmony import */ var next_dist_lib_constants__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! next/dist/lib/constants */ \"(rsc)/./node_modules/next/dist/lib/constants.js\");\n/* harmony import */ var next_dist_lib_constants__WEBPACK_IMPORTED_MODULE_13___default = /*#__PURE__*/__webpack_require__.n(next_dist_lib_constants__WEBPACK_IMPORTED_MODULE_13__);\n/* harmony import */ var next_dist_shared_lib_no_fallback_error_external__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! next/dist/shared/lib/no-fallback-error.external */ \"next/dist/shared/lib/no-fallback-error.external\");\n/* harmony import */ var next_dist_shared_lib_no_fallback_error_external__WEBPACK_IMPORTED_MODULE_14___default = /*#__PURE__*/__webpack_require__.n(next_dist_shared_lib_no_fallback_error_external__WEBPACK_IMPORTED_MODULE_14__);\n/* harmony import */ var next_dist_server_response_cache__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! next/dist/server/response-cache */ \"(rsc)/./node_modules/next/dist/server/response-cache/index.js\");\n/* harmony import */ var next_dist_server_response_cache__WEBPACK_IMPORTED_MODULE_15___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_response_cache__WEBPACK_IMPORTED_MODULE_15__);\n/* harmony import */ var D_asset_manager_vercel_supabase_app_api_google_drive_status_route_ts__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ./app/api/google-drive/status/route.ts */ \"(rsc)/./app/api/google-drive/status/route.ts\");\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/google-drive/status/route\",\n        pathname: \"/api/google-drive/status\",\n        filename: \"route\",\n        bundlePath: \"app/api/google-drive/status/route\"\n    },\n    distDir: \".next-dev\" || 0,\n    relativeProjectDir:  false || '',\n    resolvedPagePath: \"D:\\\\asset-manager-vercel-supabase\\\\app\\\\api\\\\google-drive\\\\status\\\\route.ts\",\n    nextConfigOutput,\n    userland: D_asset_manager_vercel_supabase_app_api_google_drive_status_route_ts__WEBPACK_IMPORTED_MODULE_16__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { workAsyncStorage, workUnitAsyncStorage, serverHooks } = routeModule;\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        workAsyncStorage,\n        workUnitAsyncStorage\n    });\n}\n\nasync function handler(req, res, ctx) {\n    var _nextConfig_experimental;\n    let srcPage = \"/api/google-drive/status/route\";\n    // turbopack doesn't normalize `/index` in the page name\n    // so we need to to process dynamic routes properly\n    // TODO: fix turbopack providing differing value from webpack\n    if (false) {} else if (srcPage === '/index') {\n        // we always normalize /index specifically\n        srcPage = '/';\n    }\n    const multiZoneDraftMode = false;\n    const prepareResult = await routeModule.prepare(req, res, {\n        srcPage,\n        multiZoneDraftMode\n    });\n    if (!prepareResult) {\n        res.statusCode = 400;\n        res.end('Bad Request');\n        ctx.waitUntil == null ? void 0 : ctx.waitUntil.call(ctx, Promise.resolve());\n        return null;\n    }\n    const { buildId, params, nextConfig, isDraftMode, prerenderManifest, routerServerContext, isOnDemandRevalidate, revalidateOnlyGenerated, resolvedPathname } = prepareResult;\n    const normalizedSrcPage = (0,next_dist_shared_lib_router_utils_app_paths__WEBPACK_IMPORTED_MODULE_5__.normalizeAppPath)(srcPage);\n    let isIsr = Boolean(prerenderManifest.dynamicRoutes[normalizedSrcPage] || prerenderManifest.routes[resolvedPathname]);\n    if (isIsr && !isDraftMode) {\n        const isPrerendered = Boolean(prerenderManifest.routes[resolvedPathname]);\n        const prerenderInfo = prerenderManifest.dynamicRoutes[normalizedSrcPage];\n        if (prerenderInfo) {\n            if (prerenderInfo.fallback === false && !isPrerendered) {\n                throw new next_dist_shared_lib_no_fallback_error_external__WEBPACK_IMPORTED_MODULE_14__.NoFallbackError();\n            }\n        }\n    }\n    let cacheKey = null;\n    if (isIsr && !routeModule.isDev && !isDraftMode) {\n        cacheKey = resolvedPathname;\n        // ensure /index and / is normalized to one key\n        cacheKey = cacheKey === '/index' ? '/' : cacheKey;\n    }\n    const supportsDynamicResponse = // If we're in development, we always support dynamic HTML\n    routeModule.isDev === true || // If this is not SSG or does not have static paths, then it supports\n    // dynamic HTML.\n    !isIsr;\n    // This is a revalidation request if the request is for a static\n    // page and it is not being resumed from a postponed render and\n    // it is not a dynamic RSC request then it is a revalidation\n    // request.\n    const isRevalidate = isIsr && !supportsDynamicResponse;\n    const method = req.method || 'GET';\n    const tracer = (0,next_dist_server_lib_trace_tracer__WEBPACK_IMPORTED_MODULE_4__.getTracer)();\n    const activeSpan = tracer.getActiveScopeSpan();\n    const context = {\n        params,\n        prerenderManifest,\n        renderOpts: {\n            experimental: {\n                cacheComponents: Boolean(nextConfig.experimental.cacheComponents),\n                authInterrupts: Boolean(nextConfig.experimental.authInterrupts)\n            },\n            supportsDynamicResponse,\n            incrementalCache: (0,next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_3__.getRequestMeta)(req, 'incrementalCache'),\n            cacheLifeProfiles: (_nextConfig_experimental = nextConfig.experimental) == null ? void 0 : _nextConfig_experimental.cacheLife,\n            isRevalidate,\n            waitUntil: ctx.waitUntil,\n            onClose: (cb)=>{\n                res.on('close', cb);\n            },\n            onAfterTaskError: undefined,\n            onInstrumentationRequestError: (error, _request, errorContext)=>routeModule.onRequestError(req, error, errorContext, routerServerContext)\n        },\n        sharedContext: {\n            buildId\n        }\n    };\n    const nodeNextReq = new next_dist_server_base_http_node__WEBPACK_IMPORTED_MODULE_6__.NodeNextRequest(req);\n    const nodeNextRes = new next_dist_server_base_http_node__WEBPACK_IMPORTED_MODULE_6__.NodeNextResponse(res);\n    const nextReq = next_dist_server_web_spec_extension_adapters_next_request__WEBPACK_IMPORTED_MODULE_7__.NextRequestAdapter.fromNodeNextRequest(nodeNextReq, (0,next_dist_server_web_spec_extension_adapters_next_request__WEBPACK_IMPORTED_MODULE_7__.signalFromNodeResponse)(res));\n    try {\n        const invokeRouteModule = async (span)=>{\n            return routeModule.handle(nextReq, context).finally(()=>{\n                if (!span) return;\n                span.setAttributes({\n                    'http.status_code': res.statusCode,\n                    'next.rsc': false\n                });\n                const rootSpanAttributes = tracer.getRootSpanAttributes();\n                // We were unable to get attributes, probably OTEL is not enabled\n                if (!rootSpanAttributes) {\n                    return;\n                }\n                if (rootSpanAttributes.get('next.span_type') !== next_dist_server_lib_trace_constants__WEBPACK_IMPORTED_MODULE_8__.BaseServerSpan.handleRequest) {\n                    console.warn(`Unexpected root span type '${rootSpanAttributes.get('next.span_type')}'. Please report this Next.js issue https://github.com/vercel/next.js`);\n                    return;\n                }\n                const route = rootSpanAttributes.get('next.route');\n                if (route) {\n                    const name = `${method} ${route}`;\n                    span.setAttributes({\n                        'next.route': route,\n                        'http.route': route,\n                        'next.span_name': name\n                    });\n                    span.updateName(name);\n                } else {\n                    span.updateName(`${method} ${req.url}`);\n                }\n            });\n        };\n        const handleResponse = async (currentSpan)=>{\n            var _cacheEntry_value;\n            const responseGenerator = async ({ previousCacheEntry })=>{\n                try {\n                    if (!(0,next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_3__.getRequestMeta)(req, 'minimalMode') && isOnDemandRevalidate && revalidateOnlyGenerated && !previousCacheEntry) {\n                        res.statusCode = 404;\n                        // on-demand revalidate always sets this header\n                        res.setHeader('x-nextjs-cache', 'REVALIDATED');\n                        res.end('This page could not be found');\n                        return null;\n                    }\n                    const response = await invokeRouteModule(currentSpan);\n                    req.fetchMetrics = context.renderOpts.fetchMetrics;\n                    let pendingWaitUntil = context.renderOpts.pendingWaitUntil;\n                    // Attempt using provided waitUntil if available\n                    // if it's not we fallback to sendResponse's handling\n                    if (pendingWaitUntil) {\n                        if (ctx.waitUntil) {\n                            ctx.waitUntil(pendingWaitUntil);\n                            pendingWaitUntil = undefined;\n                        }\n                    }\n                    const cacheTags = context.renderOpts.collectedTags;\n                    // If the request is for a static response, we can cache it so long\n                    // as it's not edge.\n                    if (isIsr) {\n                        const blob = await response.blob();\n                        // Copy the headers from the response.\n                        const headers = (0,next_dist_server_web_utils__WEBPACK_IMPORTED_MODULE_11__.toNodeOutgoingHttpHeaders)(response.headers);\n                        if (cacheTags) {\n                            headers[next_dist_lib_constants__WEBPACK_IMPORTED_MODULE_13__.NEXT_CACHE_TAGS_HEADER] = cacheTags;\n                        }\n                        if (!headers['content-type'] && blob.type) {\n                            headers['content-type'] = blob.type;\n                        }\n                        const revalidate = typeof context.renderOpts.collectedRevalidate === 'undefined' || context.renderOpts.collectedRevalidate >= next_dist_lib_constants__WEBPACK_IMPORTED_MODULE_13__.INFINITE_CACHE ? false : context.renderOpts.collectedRevalidate;\n                        const expire = typeof context.renderOpts.collectedExpire === 'undefined' || context.renderOpts.collectedExpire >= next_dist_lib_constants__WEBPACK_IMPORTED_MODULE_13__.INFINITE_CACHE ? undefined : context.renderOpts.collectedExpire;\n                        // Create the cache entry for the response.\n                        const cacheEntry = {\n                            value: {\n                                kind: next_dist_server_response_cache__WEBPACK_IMPORTED_MODULE_15__.CachedRouteKind.APP_ROUTE,\n                                status: response.status,\n                                body: Buffer.from(await blob.arrayBuffer()),\n                                headers\n                            },\n                            cacheControl: {\n                                revalidate,\n                                expire\n                            }\n                        };\n                        return cacheEntry;\n                    } else {\n                        // send response without caching if not ISR\n                        await (0,next_dist_server_send_response__WEBPACK_IMPORTED_MODULE_10__.sendResponse)(nodeNextReq, nodeNextRes, response, context.renderOpts.pendingWaitUntil);\n                        return null;\n                    }\n                } catch (err) {\n                    // if this is a background revalidate we need to report\n                    // the request error here as it won't be bubbled\n                    if (previousCacheEntry == null ? void 0 : previousCacheEntry.isStale) {\n                        await routeModule.onRequestError(req, err, {\n                            routerKind: 'App Router',\n                            routePath: srcPage,\n                            routeType: 'route',\n                            revalidateReason: (0,next_dist_server_instrumentation_utils__WEBPACK_IMPORTED_MODULE_9__.getRevalidateReason)({\n                                isRevalidate,\n                                isOnDemandRevalidate\n                            })\n                        }, routerServerContext);\n                    }\n                    throw err;\n                }\n            };\n            const cacheEntry = await routeModule.handleResponse({\n                req,\n                nextConfig,\n                cacheKey,\n                routeKind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n                isFallback: false,\n                prerenderManifest,\n                isRoutePPREnabled: false,\n                isOnDemandRevalidate,\n                revalidateOnlyGenerated,\n                responseGenerator,\n                waitUntil: ctx.waitUntil\n            });\n            // we don't create a cacheEntry for ISR\n            if (!isIsr) {\n                return null;\n            }\n            if ((cacheEntry == null ? void 0 : (_cacheEntry_value = cacheEntry.value) == null ? void 0 : _cacheEntry_value.kind) !== next_dist_server_response_cache__WEBPACK_IMPORTED_MODULE_15__.CachedRouteKind.APP_ROUTE) {\n                var _cacheEntry_value1;\n                throw Object.defineProperty(new Error(`Invariant: app-route received invalid cache entry ${cacheEntry == null ? void 0 : (_cacheEntry_value1 = cacheEntry.value) == null ? void 0 : _cacheEntry_value1.kind}`), \"__NEXT_ERROR_CODE\", {\n                    value: \"E701\",\n                    enumerable: false,\n                    configurable: true\n                });\n            }\n            if (!(0,next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_3__.getRequestMeta)(req, 'minimalMode')) {\n                res.setHeader('x-nextjs-cache', isOnDemandRevalidate ? 'REVALIDATED' : cacheEntry.isMiss ? 'MISS' : cacheEntry.isStale ? 'STALE' : 'HIT');\n            }\n            // Draft mode should never be cached\n            if (isDraftMode) {\n                res.setHeader('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');\n            }\n            const headers = (0,next_dist_server_web_utils__WEBPACK_IMPORTED_MODULE_11__.fromNodeOutgoingHttpHeaders)(cacheEntry.value.headers);\n            if (!((0,next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_3__.getRequestMeta)(req, 'minimalMode') && isIsr)) {\n                headers.delete(next_dist_lib_constants__WEBPACK_IMPORTED_MODULE_13__.NEXT_CACHE_TAGS_HEADER);\n            }\n            // If cache control is already set on the response we don't\n            // override it to allow users to customize it via next.config\n            if (cacheEntry.cacheControl && !res.getHeader('Cache-Control') && !headers.get('Cache-Control')) {\n                headers.set('Cache-Control', (0,next_dist_server_lib_cache_control__WEBPACK_IMPORTED_MODULE_12__.getCacheControlHeader)(cacheEntry.cacheControl));\n            }\n            await (0,next_dist_server_send_response__WEBPACK_IMPORTED_MODULE_10__.sendResponse)(nodeNextReq, nodeNextRes, new Response(cacheEntry.value.body, {\n                headers,\n                status: cacheEntry.value.status || 200\n            }));\n            return null;\n        };\n        // TODO: activeSpan code path is for when wrapped by\n        // next-server can be removed when this is no longer used\n        if (activeSpan) {\n            await handleResponse(activeSpan);\n        } else {\n            await tracer.withPropagatedContext(req.headers, ()=>tracer.trace(next_dist_server_lib_trace_constants__WEBPACK_IMPORTED_MODULE_8__.BaseServerSpan.handleRequest, {\n                    spanName: `${method} ${req.url}`,\n                    kind: next_dist_server_lib_trace_tracer__WEBPACK_IMPORTED_MODULE_4__.SpanKind.SERVER,\n                    attributes: {\n                        'http.method': method,\n                        'http.target': req.url\n                    }\n                }, handleResponse));\n        }\n    } catch (err) {\n        if (!(err instanceof next_dist_shared_lib_no_fallback_error_external__WEBPACK_IMPORTED_MODULE_14__.NoFallbackError)) {\n            await routeModule.onRequestError(req, err, {\n                routerKind: 'App Router',\n                routePath: normalizedSrcPage,\n                routeType: 'route',\n                revalidateReason: (0,next_dist_server_instrumentation_utils__WEBPACK_IMPORTED_MODULE_9__.getRevalidateReason)({\n                    isRevalidate,\n                    isOnDemandRevalidate\n                })\n            });\n        }\n        // rethrow so that we can handle serving error page\n        // If this is during static generation, throw the error again.\n        if (isIsr) throw err;\n        // Otherwise, send a 500 response.\n        await (0,next_dist_server_send_response__WEBPACK_IMPORTED_MODULE_10__.sendResponse)(nodeNextReq, nodeNextRes, new Response(null, {\n            status: 500\n        }));\n        return null;\n    }\n}\n\n//# sourceMappingURL=app-route.js.map\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIvaW5kZXguanM/bmFtZT1hcHAlMkZhcGklMkZnb29nbGUtZHJpdmUlMkZzdGF0dXMlMkZyb3V0ZSZwYWdlPSUyRmFwaSUyRmdvb2dsZS1kcml2ZSUyRnN0YXR1cyUyRnJvdXRlJmFwcFBhdGhzPSZwYWdlUGF0aD1wcml2YXRlLW5leHQtYXBwLWRpciUyRmFwaSUyRmdvb2dsZS1kcml2ZSUyRnN0YXR1cyUyRnJvdXRlLnRzJmFwcERpcj1EJTNBJTVDYXNzZXQtbWFuYWdlci12ZXJjZWwtc3VwYWJhc2UlNUNhcHAmcGFnZUV4dGVuc2lvbnM9dHN4JnBhZ2VFeHRlbnNpb25zPXRzJnBhZ2VFeHRlbnNpb25zPWpzeCZwYWdlRXh0ZW5zaW9ucz1qcyZyb290RGlyPUQlM0ElNUNhc3NldC1tYW5hZ2VyLXZlcmNlbC1zdXBhYmFzZSZpc0Rldj10cnVlJnRzY29uZmlnUGF0aD10c2NvbmZpZy5qc29uJmJhc2VQYXRoPSZhc3NldFByZWZpeD0mbmV4dENvbmZpZ091dHB1dD0mcHJlZmVycmVkUmVnaW9uPSZtaWRkbGV3YXJlQ29uZmlnPWUzMCUzRCZpc0dsb2JhbE5vdEZvdW5kRW5hYmxlZD0hIiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQStGO0FBQ3ZDO0FBQ3FCO0FBQ2Q7QUFDUztBQUNPO0FBQ0s7QUFDbUM7QUFDakQ7QUFDTztBQUNmO0FBQ3NDO0FBQ3pCO0FBQ007QUFDQztBQUNoQjtBQUNzQztBQUN4RztBQUNBO0FBQ0E7QUFDQSx3QkFBd0IseUdBQW1CO0FBQzNDO0FBQ0EsY0FBYyxrRUFBUztBQUN2QjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTCxhQUFhLFdBQW9DLElBQUksQ0FBRTtBQUN2RCx3QkFBd0IsTUFBdUM7QUFDL0Q7QUFDQTtBQUNBLFlBQVk7QUFDWixDQUFDO0FBQ0Q7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WTtBQUM5QjtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDViw2RUFBNkUsZ0ZBQWM7QUFDM0YsaUNBQWlDLFFBQVEsRUFBRSxRQUFRO0FBQ25ELDBCQUEwQix1RUFBUTtBQUNsQztBQUNBO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQjtBQUNBLE1BQU07QUFDTiw2QkFBNkIsNkZBQWU7QUFDNUM7QUFDQTtBQUNBO0FBQ0E7QUFDQSxrQ0FBa0MsMkZBQW1CO0FBQ3JEO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakIsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxjQUFjLDZFQUFZO0FBQzFCO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTs7QUFFQSIsInNvdXJjZXMiOlsiIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcFJvdXRlUm91dGVNb2R1bGUgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9yb3V0ZS1tb2R1bGVzL2FwcC1yb3V0ZS9tb2R1bGUuY29tcGlsZWRcIjtcbmltcG9ydCB7IFJvdXRlS2luZCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL3JvdXRlLWtpbmRcIjtcbmltcG9ydCB7IHBhdGNoRmV0Y2ggYXMgX3BhdGNoRmV0Y2ggfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9saWIvcGF0Y2gtZmV0Y2hcIjtcbmltcG9ydCB7IGdldFJlcXVlc3RNZXRhIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvcmVxdWVzdC1tZXRhXCI7XG5pbXBvcnQgeyBnZXRUcmFjZXIsIFNwYW5LaW5kIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvbGliL3RyYWNlL3RyYWNlclwiO1xuaW1wb3J0IHsgbm9ybWFsaXplQXBwUGF0aCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2hhcmVkL2xpYi9yb3V0ZXIvdXRpbHMvYXBwLXBhdGhzXCI7XG5pbXBvcnQgeyBOb2RlTmV4dFJlcXVlc3QsIE5vZGVOZXh0UmVzcG9uc2UgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9iYXNlLWh0dHAvbm9kZVwiO1xuaW1wb3J0IHsgTmV4dFJlcXVlc3RBZGFwdGVyLCBzaWduYWxGcm9tTm9kZVJlc3BvbnNlIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvd2ViL3NwZWMtZXh0ZW5zaW9uL2FkYXB0ZXJzL25leHQtcmVxdWVzdFwiO1xuaW1wb3J0IHsgQmFzZVNlcnZlclNwYW4gfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9saWIvdHJhY2UvY29uc3RhbnRzXCI7XG5pbXBvcnQgeyBnZXRSZXZhbGlkYXRlUmVhc29uIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvaW5zdHJ1bWVudGF0aW9uL3V0aWxzXCI7XG5pbXBvcnQgeyBzZW5kUmVzcG9uc2UgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9zZW5kLXJlc3BvbnNlXCI7XG5pbXBvcnQgeyBmcm9tTm9kZU91dGdvaW5nSHR0cEhlYWRlcnMsIHRvTm9kZU91dGdvaW5nSHR0cEhlYWRlcnMgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci93ZWIvdXRpbHNcIjtcbmltcG9ydCB7IGdldENhY2hlQ29udHJvbEhlYWRlciB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2xpYi9jYWNoZS1jb250cm9sXCI7XG5pbXBvcnQgeyBJTkZJTklURV9DQUNIRSwgTkVYVF9DQUNIRV9UQUdTX0hFQURFUiB9IGZyb20gXCJuZXh0L2Rpc3QvbGliL2NvbnN0YW50c1wiO1xuaW1wb3J0IHsgTm9GYWxsYmFja0Vycm9yIH0gZnJvbSBcIm5leHQvZGlzdC9zaGFyZWQvbGliL25vLWZhbGxiYWNrLWVycm9yLmV4dGVybmFsXCI7XG5pbXBvcnQgeyBDYWNoZWRSb3V0ZUtpbmQgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9yZXNwb25zZS1jYWNoZVwiO1xuaW1wb3J0ICogYXMgdXNlcmxhbmQgZnJvbSBcIkQ6XFxcXGFzc2V0LW1hbmFnZXItdmVyY2VsLXN1cGFiYXNlXFxcXGFwcFxcXFxhcGlcXFxcZ29vZ2xlLWRyaXZlXFxcXHN0YXR1c1xcXFxyb3V0ZS50c1wiO1xuLy8gV2UgaW5qZWN0IHRoZSBuZXh0Q29uZmlnT3V0cHV0IGhlcmUgc28gdGhhdCB3ZSBjYW4gdXNlIHRoZW0gaW4gdGhlIHJvdXRlXG4vLyBtb2R1bGUuXG5jb25zdCBuZXh0Q29uZmlnT3V0cHV0ID0gXCJcIlxuY29uc3Qgcm91dGVNb2R1bGUgPSBuZXcgQXBwUm91dGVSb3V0ZU1vZHVsZSh7XG4gICAgZGVmaW5pdGlvbjoge1xuICAgICAgICBraW5kOiBSb3V0ZUtpbmQuQVBQX1JPVVRFLFxuICAgICAgICBwYWdlOiBcIi9hcGkvZ29vZ2xlLWRyaXZlL3N0YXR1cy9yb3V0ZVwiLFxuICAgICAgICBwYXRobmFtZTogXCIvYXBpL2dvb2dsZS1kcml2ZS9zdGF0dXNcIixcbiAgICAgICAgZmlsZW5hbWU6IFwicm91dGVcIixcbiAgICAgICAgYnVuZGxlUGF0aDogXCJhcHAvYXBpL2dvb2dsZS1kcml2ZS9zdGF0dXMvcm91dGVcIlxuICAgIH0sXG4gICAgZGlzdERpcjogcHJvY2Vzcy5lbnYuX19ORVhUX1JFTEFUSVZFX0RJU1RfRElSIHx8ICcnLFxuICAgIHJlbGF0aXZlUHJvamVjdERpcjogcHJvY2Vzcy5lbnYuX19ORVhUX1JFTEFUSVZFX1BST0pFQ1RfRElSIHx8ICcnLFxuICAgIHJlc29sdmVkUGFnZVBhdGg6IFwiRDpcXFxcYXNzZXQtbWFuYWdlci12ZXJjZWwtc3VwYWJhc2VcXFxcYXBwXFxcXGFwaVxcXFxnb29nbGUtZHJpdmVcXFxcc3RhdHVzXFxcXHJvdXRlLnRzXCIsXG4gICAgbmV4dENvbmZpZ091dHB1dCxcbiAgICB1c2VybGFuZFxufSk7XG4vLyBQdWxsIG91dCB0aGUgZXhwb3J0cyB0aGF0IHdlIG5lZWQgdG8gZXhwb3NlIGZyb20gdGhlIG1vZHVsZS4gVGhpcyBzaG91bGRcbi8vIGJlIGVsaW1pbmF0ZWQgd2hlbiB3ZSd2ZSBtb3ZlZCB0aGUgb3RoZXIgcm91dGVzIHRvIHRoZSBuZXcgZm9ybWF0LiBUaGVzZVxuLy8gYXJlIHVzZWQgdG8gaG9vayBpbnRvIHRoZSByb3V0ZS5cbmNvbnN0IHsgd29ya0FzeW5jU3RvcmFnZSwgd29ya1VuaXRBc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzIH0gPSByb3V0ZU1vZHVsZTtcbmZ1bmN0aW9uIHBhdGNoRmV0Y2goKSB7XG4gICAgcmV0dXJuIF9wYXRjaEZldGNoKHtcbiAgICAgICAgd29ya0FzeW5jU3RvcmFnZSxcbiAgICAgICAgd29ya1VuaXRBc3luY1N0b3JhZ2VcbiAgICB9KTtcbn1cbmV4cG9ydCB7IHJvdXRlTW9kdWxlLCB3b3JrQXN5bmNTdG9yYWdlLCB3b3JrVW5pdEFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MsIHBhdGNoRmV0Y2gsICB9O1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZXIocmVxLCByZXMsIGN0eCkge1xuICAgIHZhciBfbmV4dENvbmZpZ19leHBlcmltZW50YWw7XG4gICAgbGV0IHNyY1BhZ2UgPSBcIi9hcGkvZ29vZ2xlLWRyaXZlL3N0YXR1cy9yb3V0ZVwiO1xuICAgIC8vIHR1cmJvcGFjayBkb2Vzbid0IG5vcm1hbGl6ZSBgL2luZGV4YCBpbiB0aGUgcGFnZSBuYW1lXG4gICAgLy8gc28gd2UgbmVlZCB0byB0byBwcm9jZXNzIGR5bmFtaWMgcm91dGVzIHByb3Blcmx5XG4gICAgLy8gVE9ETzogZml4IHR1cmJvcGFjayBwcm92aWRpbmcgZGlmZmVyaW5nIHZhbHVlIGZyb20gd2VicGFja1xuICAgIGlmIChwcm9jZXNzLmVudi5UVVJCT1BBQ0spIHtcbiAgICAgICAgc3JjUGFnZSA9IHNyY1BhZ2UucmVwbGFjZSgvXFwvaW5kZXgkLywgJycpIHx8ICcvJztcbiAgICB9IGVsc2UgaWYgKHNyY1BhZ2UgPT09ICcvaW5kZXgnKSB7XG4gICAgICAgIC8vIHdlIGFsd2F5cyBub3JtYWxpemUgL2luZGV4IHNwZWNpZmljYWxseVxuICAgICAgICBzcmNQYWdlID0gJy8nO1xuICAgIH1cbiAgICBjb25zdCBtdWx0aVpvbmVEcmFmdE1vZGUgPSBwcm9jZXNzLmVudi5fX05FWFRfTVVMVElfWk9ORV9EUkFGVF9NT0RFO1xuICAgIGNvbnN0IHByZXBhcmVSZXN1bHQgPSBhd2FpdCByb3V0ZU1vZHVsZS5wcmVwYXJlKHJlcSwgcmVzLCB7XG4gICAgICAgIHNyY1BhZ2UsXG4gICAgICAgIG11bHRpWm9uZURyYWZ0TW9kZVxuICAgIH0pO1xuICAgIGlmICghcHJlcGFyZVJlc3VsdCkge1xuICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwMDtcbiAgICAgICAgcmVzLmVuZCgnQmFkIFJlcXVlc3QnKTtcbiAgICAgICAgY3R4LndhaXRVbnRpbCA9PSBudWxsID8gdm9pZCAwIDogY3R4LndhaXRVbnRpbC5jYWxsKGN0eCwgUHJvbWlzZS5yZXNvbHZlKCkpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgeyBidWlsZElkLCBwYXJhbXMsIG5leHRDb25maWcsIGlzRHJhZnRNb2RlLCBwcmVyZW5kZXJNYW5pZmVzdCwgcm91dGVyU2VydmVyQ29udGV4dCwgaXNPbkRlbWFuZFJldmFsaWRhdGUsIHJldmFsaWRhdGVPbmx5R2VuZXJhdGVkLCByZXNvbHZlZFBhdGhuYW1lIH0gPSBwcmVwYXJlUmVzdWx0O1xuICAgIGNvbnN0IG5vcm1hbGl6ZWRTcmNQYWdlID0gbm9ybWFsaXplQXBwUGF0aChzcmNQYWdlKTtcbiAgICBsZXQgaXNJc3IgPSBCb29sZWFuKHByZXJlbmRlck1hbmlmZXN0LmR5bmFtaWNSb3V0ZXNbbm9ybWFsaXplZFNyY1BhZ2VdIHx8IHByZXJlbmRlck1hbmlmZXN0LnJvdXRlc1tyZXNvbHZlZFBhdGhuYW1lXSk7XG4gICAgaWYgKGlzSXNyICYmICFpc0RyYWZ0TW9kZSkge1xuICAgICAgICBjb25zdCBpc1ByZXJlbmRlcmVkID0gQm9vbGVhbihwcmVyZW5kZXJNYW5pZmVzdC5yb3V0ZXNbcmVzb2x2ZWRQYXRobmFtZV0pO1xuICAgICAgICBjb25zdCBwcmVyZW5kZXJJbmZvID0gcHJlcmVuZGVyTWFuaWZlc3QuZHluYW1pY1JvdXRlc1tub3JtYWxpemVkU3JjUGFnZV07XG4gICAgICAgIGlmIChwcmVyZW5kZXJJbmZvKSB7XG4gICAgICAgICAgICBpZiAocHJlcmVuZGVySW5mby5mYWxsYmFjayA9PT0gZmFsc2UgJiYgIWlzUHJlcmVuZGVyZWQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgTm9GYWxsYmFja0Vycm9yKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgbGV0IGNhY2hlS2V5ID0gbnVsbDtcbiAgICBpZiAoaXNJc3IgJiYgIXJvdXRlTW9kdWxlLmlzRGV2ICYmICFpc0RyYWZ0TW9kZSkge1xuICAgICAgICBjYWNoZUtleSA9IHJlc29sdmVkUGF0aG5hbWU7XG4gICAgICAgIC8vIGVuc3VyZSAvaW5kZXggYW5kIC8gaXMgbm9ybWFsaXplZCB0byBvbmUga2V5XG4gICAgICAgIGNhY2hlS2V5ID0gY2FjaGVLZXkgPT09ICcvaW5kZXgnID8gJy8nIDogY2FjaGVLZXk7XG4gICAgfVxuICAgIGNvbnN0IHN1cHBvcnRzRHluYW1pY1Jlc3BvbnNlID0gLy8gSWYgd2UncmUgaW4gZGV2ZWxvcG1lbnQsIHdlIGFsd2F5cyBzdXBwb3J0IGR5bmFtaWMgSFRNTFxuICAgIHJvdXRlTW9kdWxlLmlzRGV2ID09PSB0cnVlIHx8IC8vIElmIHRoaXMgaXMgbm90IFNTRyBvciBkb2VzIG5vdCBoYXZlIHN0YXRpYyBwYXRocywgdGhlbiBpdCBzdXBwb3J0c1xuICAgIC8vIGR5bmFtaWMgSFRNTC5cbiAgICAhaXNJc3I7XG4gICAgLy8gVGhpcyBpcyBhIHJldmFsaWRhdGlvbiByZXF1ZXN0IGlmIHRoZSByZXF1ZXN0IGlzIGZvciBhIHN0YXRpY1xuICAgIC8vIHBhZ2UgYW5kIGl0IGlzIG5vdCBiZWluZyByZXN1bWVkIGZyb20gYSBwb3N0cG9uZWQgcmVuZGVyIGFuZFxuICAgIC8vIGl0IGlzIG5vdCBhIGR5bmFtaWMgUlNDIHJlcXVlc3QgdGhlbiBpdCBpcyBhIHJldmFsaWRhdGlvblxuICAgIC8vIHJlcXVlc3QuXG4gICAgY29uc3QgaXNSZXZhbGlkYXRlID0gaXNJc3IgJiYgIXN1cHBvcnRzRHluYW1pY1Jlc3BvbnNlO1xuICAgIGNvbnN0IG1ldGhvZCA9IHJlcS5tZXRob2QgfHwgJ0dFVCc7XG4gICAgY29uc3QgdHJhY2VyID0gZ2V0VHJhY2VyKCk7XG4gICAgY29uc3QgYWN0aXZlU3BhbiA9IHRyYWNlci5nZXRBY3RpdmVTY29wZVNwYW4oKTtcbiAgICBjb25zdCBjb250ZXh0ID0ge1xuICAgICAgICBwYXJhbXMsXG4gICAgICAgIHByZXJlbmRlck1hbmlmZXN0LFxuICAgICAgICByZW5kZXJPcHRzOiB7XG4gICAgICAgICAgICBleHBlcmltZW50YWw6IHtcbiAgICAgICAgICAgICAgICBjYWNoZUNvbXBvbmVudHM6IEJvb2xlYW4obmV4dENvbmZpZy5leHBlcmltZW50YWwuY2FjaGVDb21wb25lbnRzKSxcbiAgICAgICAgICAgICAgICBhdXRoSW50ZXJydXB0czogQm9vbGVhbihuZXh0Q29uZmlnLmV4cGVyaW1lbnRhbC5hdXRoSW50ZXJydXB0cylcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdXBwb3J0c0R5bmFtaWNSZXNwb25zZSxcbiAgICAgICAgICAgIGluY3JlbWVudGFsQ2FjaGU6IGdldFJlcXVlc3RNZXRhKHJlcSwgJ2luY3JlbWVudGFsQ2FjaGUnKSxcbiAgICAgICAgICAgIGNhY2hlTGlmZVByb2ZpbGVzOiAoX25leHRDb25maWdfZXhwZXJpbWVudGFsID0gbmV4dENvbmZpZy5leHBlcmltZW50YWwpID09IG51bGwgPyB2b2lkIDAgOiBfbmV4dENvbmZpZ19leHBlcmltZW50YWwuY2FjaGVMaWZlLFxuICAgICAgICAgICAgaXNSZXZhbGlkYXRlLFxuICAgICAgICAgICAgd2FpdFVudGlsOiBjdHgud2FpdFVudGlsLFxuICAgICAgICAgICAgb25DbG9zZTogKGNiKT0+e1xuICAgICAgICAgICAgICAgIHJlcy5vbignY2xvc2UnLCBjYik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25BZnRlclRhc2tFcnJvcjogdW5kZWZpbmVkLFxuICAgICAgICAgICAgb25JbnN0cnVtZW50YXRpb25SZXF1ZXN0RXJyb3I6IChlcnJvciwgX3JlcXVlc3QsIGVycm9yQ29udGV4dCk9PnJvdXRlTW9kdWxlLm9uUmVxdWVzdEVycm9yKHJlcSwgZXJyb3IsIGVycm9yQ29udGV4dCwgcm91dGVyU2VydmVyQ29udGV4dClcbiAgICAgICAgfSxcbiAgICAgICAgc2hhcmVkQ29udGV4dDoge1xuICAgICAgICAgICAgYnVpbGRJZFxuICAgICAgICB9XG4gICAgfTtcbiAgICBjb25zdCBub2RlTmV4dFJlcSA9IG5ldyBOb2RlTmV4dFJlcXVlc3QocmVxKTtcbiAgICBjb25zdCBub2RlTmV4dFJlcyA9IG5ldyBOb2RlTmV4dFJlc3BvbnNlKHJlcyk7XG4gICAgY29uc3QgbmV4dFJlcSA9IE5leHRSZXF1ZXN0QWRhcHRlci5mcm9tTm9kZU5leHRSZXF1ZXN0KG5vZGVOZXh0UmVxLCBzaWduYWxGcm9tTm9kZVJlc3BvbnNlKHJlcykpO1xuICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGludm9rZVJvdXRlTW9kdWxlID0gYXN5bmMgKHNwYW4pPT57XG4gICAgICAgICAgICByZXR1cm4gcm91dGVNb2R1bGUuaGFuZGxlKG5leHRSZXEsIGNvbnRleHQpLmZpbmFsbHkoKCk9PntcbiAgICAgICAgICAgICAgICBpZiAoIXNwYW4pIHJldHVybjtcbiAgICAgICAgICAgICAgICBzcGFuLnNldEF0dHJpYnV0ZXMoe1xuICAgICAgICAgICAgICAgICAgICAnaHR0cC5zdGF0dXNfY29kZSc6IHJlcy5zdGF0dXNDb2RlLFxuICAgICAgICAgICAgICAgICAgICAnbmV4dC5yc2MnOiBmYWxzZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJvb3RTcGFuQXR0cmlidXRlcyA9IHRyYWNlci5nZXRSb290U3BhbkF0dHJpYnV0ZXMoKTtcbiAgICAgICAgICAgICAgICAvLyBXZSB3ZXJlIHVuYWJsZSB0byBnZXQgYXR0cmlidXRlcywgcHJvYmFibHkgT1RFTCBpcyBub3QgZW5hYmxlZFxuICAgICAgICAgICAgICAgIGlmICghcm9vdFNwYW5BdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHJvb3RTcGFuQXR0cmlidXRlcy5nZXQoJ25leHQuc3Bhbl90eXBlJykgIT09IEJhc2VTZXJ2ZXJTcGFuLmhhbmRsZVJlcXVlc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGBVbmV4cGVjdGVkIHJvb3Qgc3BhbiB0eXBlICcke3Jvb3RTcGFuQXR0cmlidXRlcy5nZXQoJ25leHQuc3Bhbl90eXBlJyl9Jy4gUGxlYXNlIHJlcG9ydCB0aGlzIE5leHQuanMgaXNzdWUgaHR0cHM6Ly9naXRodWIuY29tL3ZlcmNlbC9uZXh0LmpzYCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3Qgcm91dGUgPSByb290U3BhbkF0dHJpYnV0ZXMuZ2V0KCduZXh0LnJvdXRlJyk7XG4gICAgICAgICAgICAgICAgaWYgKHJvdXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBgJHttZXRob2R9ICR7cm91dGV9YDtcbiAgICAgICAgICAgICAgICAgICAgc3Bhbi5zZXRBdHRyaWJ1dGVzKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICduZXh0LnJvdXRlJzogcm91dGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAnaHR0cC5yb3V0ZSc6IHJvdXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ25leHQuc3Bhbl9uYW1lJzogbmFtZVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3Bhbi51cGRhdGVOYW1lKG5hbWUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHNwYW4udXBkYXRlTmFtZShgJHttZXRob2R9ICR7cmVxLnVybH1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgaGFuZGxlUmVzcG9uc2UgPSBhc3luYyAoY3VycmVudFNwYW4pPT57XG4gICAgICAgICAgICB2YXIgX2NhY2hlRW50cnlfdmFsdWU7XG4gICAgICAgICAgICBjb25zdCByZXNwb25zZUdlbmVyYXRvciA9IGFzeW5jICh7IHByZXZpb3VzQ2FjaGVFbnRyeSB9KT0+e1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghZ2V0UmVxdWVzdE1ldGEocmVxLCAnbWluaW1hbE1vZGUnKSAmJiBpc09uRGVtYW5kUmV2YWxpZGF0ZSAmJiByZXZhbGlkYXRlT25seUdlbmVyYXRlZCAmJiAhcHJldmlvdXNDYWNoZUVudHJ5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwNDtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9uLWRlbWFuZCByZXZhbGlkYXRlIGFsd2F5cyBzZXRzIHRoaXMgaGVhZGVyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKCd4LW5leHRqcy1jYWNoZScsICdSRVZBTElEQVRFRCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLmVuZCgnVGhpcyBwYWdlIGNvdWxkIG5vdCBiZSBmb3VuZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBpbnZva2VSb3V0ZU1vZHVsZShjdXJyZW50U3Bhbik7XG4gICAgICAgICAgICAgICAgICAgIHJlcS5mZXRjaE1ldHJpY3MgPSBjb250ZXh0LnJlbmRlck9wdHMuZmV0Y2hNZXRyaWNzO1xuICAgICAgICAgICAgICAgICAgICBsZXQgcGVuZGluZ1dhaXRVbnRpbCA9IGNvbnRleHQucmVuZGVyT3B0cy5wZW5kaW5nV2FpdFVudGlsO1xuICAgICAgICAgICAgICAgICAgICAvLyBBdHRlbXB0IHVzaW5nIHByb3ZpZGVkIHdhaXRVbnRpbCBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgaXQncyBub3Qgd2UgZmFsbGJhY2sgdG8gc2VuZFJlc3BvbnNlJ3MgaGFuZGxpbmdcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBlbmRpbmdXYWl0VW50aWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdHgud2FpdFVudGlsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3R4LndhaXRVbnRpbChwZW5kaW5nV2FpdFVudGlsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZW5kaW5nV2FpdFVudGlsID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNhY2hlVGFncyA9IGNvbnRleHQucmVuZGVyT3B0cy5jb2xsZWN0ZWRUYWdzO1xuICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGUgcmVxdWVzdCBpcyBmb3IgYSBzdGF0aWMgcmVzcG9uc2UsIHdlIGNhbiBjYWNoZSBpdCBzbyBsb25nXG4gICAgICAgICAgICAgICAgICAgIC8vIGFzIGl0J3Mgbm90IGVkZ2UuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0lzcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYmxvYiA9IGF3YWl0IHJlc3BvbnNlLmJsb2IoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENvcHkgdGhlIGhlYWRlcnMgZnJvbSB0aGUgcmVzcG9uc2UuXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXJzID0gdG9Ob2RlT3V0Z29pbmdIdHRwSGVhZGVycyhyZXNwb25zZS5oZWFkZXJzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjYWNoZVRhZ3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWFkZXJzW05FWFRfQ0FDSEVfVEFHU19IRUFERVJdID0gY2FjaGVUYWdzO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFoZWFkZXJzWydjb250ZW50LXR5cGUnXSAmJiBibG9iLnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWFkZXJzWydjb250ZW50LXR5cGUnXSA9IGJsb2IudHlwZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJldmFsaWRhdGUgPSB0eXBlb2YgY29udGV4dC5yZW5kZXJPcHRzLmNvbGxlY3RlZFJldmFsaWRhdGUgPT09ICd1bmRlZmluZWQnIHx8IGNvbnRleHQucmVuZGVyT3B0cy5jb2xsZWN0ZWRSZXZhbGlkYXRlID49IElORklOSVRFX0NBQ0hFID8gZmFsc2UgOiBjb250ZXh0LnJlbmRlck9wdHMuY29sbGVjdGVkUmV2YWxpZGF0ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGV4cGlyZSA9IHR5cGVvZiBjb250ZXh0LnJlbmRlck9wdHMuY29sbGVjdGVkRXhwaXJlID09PSAndW5kZWZpbmVkJyB8fCBjb250ZXh0LnJlbmRlck9wdHMuY29sbGVjdGVkRXhwaXJlID49IElORklOSVRFX0NBQ0hFID8gdW5kZWZpbmVkIDogY29udGV4dC5yZW5kZXJPcHRzLmNvbGxlY3RlZEV4cGlyZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENyZWF0ZSB0aGUgY2FjaGUgZW50cnkgZm9yIHRoZSByZXNwb25zZS5cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNhY2hlRW50cnkgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAga2luZDogQ2FjaGVkUm91dGVLaW5kLkFQUF9ST1VURSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHVzOiByZXNwb25zZS5zdGF0dXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJvZHk6IEJ1ZmZlci5mcm9tKGF3YWl0IGJsb2IuYXJyYXlCdWZmZXIoKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlYWRlcnNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhY2hlQ29udHJvbDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXZhbGlkYXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBpcmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhY2hlRW50cnk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzZW5kIHJlc3BvbnNlIHdpdGhvdXQgY2FjaGluZyBpZiBub3QgSVNSXG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBzZW5kUmVzcG9uc2Uobm9kZU5leHRSZXEsIG5vZGVOZXh0UmVzLCByZXNwb25zZSwgY29udGV4dC5yZW5kZXJPcHRzLnBlbmRpbmdXYWl0VW50aWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgdGhpcyBpcyBhIGJhY2tncm91bmQgcmV2YWxpZGF0ZSB3ZSBuZWVkIHRvIHJlcG9ydFxuICAgICAgICAgICAgICAgICAgICAvLyB0aGUgcmVxdWVzdCBlcnJvciBoZXJlIGFzIGl0IHdvbid0IGJlIGJ1YmJsZWRcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByZXZpb3VzQ2FjaGVFbnRyeSA9PSBudWxsID8gdm9pZCAwIDogcHJldmlvdXNDYWNoZUVudHJ5LmlzU3RhbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHJvdXRlTW9kdWxlLm9uUmVxdWVzdEVycm9yKHJlcSwgZXJyLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcm91dGVyS2luZDogJ0FwcCBSb3V0ZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvdXRlUGF0aDogc3JjUGFnZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3V0ZVR5cGU6ICdyb3V0ZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV2YWxpZGF0ZVJlYXNvbjogZ2V0UmV2YWxpZGF0ZVJlYXNvbih7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzUmV2YWxpZGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNPbkRlbWFuZFJldmFsaWRhdGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgcm91dGVyU2VydmVyQ29udGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjb25zdCBjYWNoZUVudHJ5ID0gYXdhaXQgcm91dGVNb2R1bGUuaGFuZGxlUmVzcG9uc2Uoe1xuICAgICAgICAgICAgICAgIHJlcSxcbiAgICAgICAgICAgICAgICBuZXh0Q29uZmlnLFxuICAgICAgICAgICAgICAgIGNhY2hlS2V5LFxuICAgICAgICAgICAgICAgIHJvdXRlS2luZDogUm91dGVLaW5kLkFQUF9ST1VURSxcbiAgICAgICAgICAgICAgICBpc0ZhbGxiYWNrOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBwcmVyZW5kZXJNYW5pZmVzdCxcbiAgICAgICAgICAgICAgICBpc1JvdXRlUFBSRW5hYmxlZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgaXNPbkRlbWFuZFJldmFsaWRhdGUsXG4gICAgICAgICAgICAgICAgcmV2YWxpZGF0ZU9ubHlHZW5lcmF0ZWQsXG4gICAgICAgICAgICAgICAgcmVzcG9uc2VHZW5lcmF0b3IsXG4gICAgICAgICAgICAgICAgd2FpdFVudGlsOiBjdHgud2FpdFVudGlsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIC8vIHdlIGRvbid0IGNyZWF0ZSBhIGNhY2hlRW50cnkgZm9yIElTUlxuICAgICAgICAgICAgaWYgKCFpc0lzcikge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKChjYWNoZUVudHJ5ID09IG51bGwgPyB2b2lkIDAgOiAoX2NhY2hlRW50cnlfdmFsdWUgPSBjYWNoZUVudHJ5LnZhbHVlKSA9PSBudWxsID8gdm9pZCAwIDogX2NhY2hlRW50cnlfdmFsdWUua2luZCkgIT09IENhY2hlZFJvdXRlS2luZC5BUFBfUk9VVEUpIHtcbiAgICAgICAgICAgICAgICB2YXIgX2NhY2hlRW50cnlfdmFsdWUxO1xuICAgICAgICAgICAgICAgIHRocm93IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShuZXcgRXJyb3IoYEludmFyaWFudDogYXBwLXJvdXRlIHJlY2VpdmVkIGludmFsaWQgY2FjaGUgZW50cnkgJHtjYWNoZUVudHJ5ID09IG51bGwgPyB2b2lkIDAgOiAoX2NhY2hlRW50cnlfdmFsdWUxID0gY2FjaGVFbnRyeS52YWx1ZSkgPT0gbnVsbCA/IHZvaWQgMCA6IF9jYWNoZUVudHJ5X3ZhbHVlMS5raW5kfWApLCBcIl9fTkVYVF9FUlJPUl9DT0RFXCIsIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IFwiRTcwMVwiLFxuICAgICAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWdldFJlcXVlc3RNZXRhKHJlcSwgJ21pbmltYWxNb2RlJykpIHtcbiAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKCd4LW5leHRqcy1jYWNoZScsIGlzT25EZW1hbmRSZXZhbGlkYXRlID8gJ1JFVkFMSURBVEVEJyA6IGNhY2hlRW50cnkuaXNNaXNzID8gJ01JU1MnIDogY2FjaGVFbnRyeS5pc1N0YWxlID8gJ1NUQUxFJyA6ICdISVQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIERyYWZ0IG1vZGUgc2hvdWxkIG5ldmVyIGJlIGNhY2hlZFxuICAgICAgICAgICAgaWYgKGlzRHJhZnRNb2RlKSB7XG4gICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQ2FjaGUtQ29udHJvbCcsICdwcml2YXRlLCBuby1jYWNoZSwgbm8tc3RvcmUsIG1heC1hZ2U9MCwgbXVzdC1yZXZhbGlkYXRlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBoZWFkZXJzID0gZnJvbU5vZGVPdXRnb2luZ0h0dHBIZWFkZXJzKGNhY2hlRW50cnkudmFsdWUuaGVhZGVycyk7XG4gICAgICAgICAgICBpZiAoIShnZXRSZXF1ZXN0TWV0YShyZXEsICdtaW5pbWFsTW9kZScpICYmIGlzSXNyKSkge1xuICAgICAgICAgICAgICAgIGhlYWRlcnMuZGVsZXRlKE5FWFRfQ0FDSEVfVEFHU19IRUFERVIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gSWYgY2FjaGUgY29udHJvbCBpcyBhbHJlYWR5IHNldCBvbiB0aGUgcmVzcG9uc2Ugd2UgZG9uJ3RcbiAgICAgICAgICAgIC8vIG92ZXJyaWRlIGl0IHRvIGFsbG93IHVzZXJzIHRvIGN1c3RvbWl6ZSBpdCB2aWEgbmV4dC5jb25maWdcbiAgICAgICAgICAgIGlmIChjYWNoZUVudHJ5LmNhY2hlQ29udHJvbCAmJiAhcmVzLmdldEhlYWRlcignQ2FjaGUtQ29udHJvbCcpICYmICFoZWFkZXJzLmdldCgnQ2FjaGUtQ29udHJvbCcpKSB7XG4gICAgICAgICAgICAgICAgaGVhZGVycy5zZXQoJ0NhY2hlLUNvbnRyb2wnLCBnZXRDYWNoZUNvbnRyb2xIZWFkZXIoY2FjaGVFbnRyeS5jYWNoZUNvbnRyb2wpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGF3YWl0IHNlbmRSZXNwb25zZShub2RlTmV4dFJlcSwgbm9kZU5leHRSZXMsIG5ldyBSZXNwb25zZShjYWNoZUVudHJ5LnZhbHVlLmJvZHksIHtcbiAgICAgICAgICAgICAgICBoZWFkZXJzLFxuICAgICAgICAgICAgICAgIHN0YXR1czogY2FjaGVFbnRyeS52YWx1ZS5zdGF0dXMgfHwgMjAwXG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfTtcbiAgICAgICAgLy8gVE9ETzogYWN0aXZlU3BhbiBjb2RlIHBhdGggaXMgZm9yIHdoZW4gd3JhcHBlZCBieVxuICAgICAgICAvLyBuZXh0LXNlcnZlciBjYW4gYmUgcmVtb3ZlZCB3aGVuIHRoaXMgaXMgbm8gbG9uZ2VyIHVzZWRcbiAgICAgICAgaWYgKGFjdGl2ZVNwYW4pIHtcbiAgICAgICAgICAgIGF3YWl0IGhhbmRsZVJlc3BvbnNlKGFjdGl2ZVNwYW4pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXdhaXQgdHJhY2VyLndpdGhQcm9wYWdhdGVkQ29udGV4dChyZXEuaGVhZGVycywgKCk9PnRyYWNlci50cmFjZShCYXNlU2VydmVyU3Bhbi5oYW5kbGVSZXF1ZXN0LCB7XG4gICAgICAgICAgICAgICAgICAgIHNwYW5OYW1lOiBgJHttZXRob2R9ICR7cmVxLnVybH1gLFxuICAgICAgICAgICAgICAgICAgICBraW5kOiBTcGFuS2luZC5TRVJWRVIsXG4gICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdodHRwLm1ldGhvZCc6IG1ldGhvZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICdodHRwLnRhcmdldCc6IHJlcS51cmxcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIGhhbmRsZVJlc3BvbnNlKSk7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgaWYgKCEoZXJyIGluc3RhbmNlb2YgTm9GYWxsYmFja0Vycm9yKSkge1xuICAgICAgICAgICAgYXdhaXQgcm91dGVNb2R1bGUub25SZXF1ZXN0RXJyb3IocmVxLCBlcnIsIHtcbiAgICAgICAgICAgICAgICByb3V0ZXJLaW5kOiAnQXBwIFJvdXRlcicsXG4gICAgICAgICAgICAgICAgcm91dGVQYXRoOiBub3JtYWxpemVkU3JjUGFnZSxcbiAgICAgICAgICAgICAgICByb3V0ZVR5cGU6ICdyb3V0ZScsXG4gICAgICAgICAgICAgICAgcmV2YWxpZGF0ZVJlYXNvbjogZ2V0UmV2YWxpZGF0ZVJlYXNvbih7XG4gICAgICAgICAgICAgICAgICAgIGlzUmV2YWxpZGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgaXNPbkRlbWFuZFJldmFsaWRhdGVcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gcmV0aHJvdyBzbyB0aGF0IHdlIGNhbiBoYW5kbGUgc2VydmluZyBlcnJvciBwYWdlXG4gICAgICAgIC8vIElmIHRoaXMgaXMgZHVyaW5nIHN0YXRpYyBnZW5lcmF0aW9uLCB0aHJvdyB0aGUgZXJyb3IgYWdhaW4uXG4gICAgICAgIGlmIChpc0lzcikgdGhyb3cgZXJyO1xuICAgICAgICAvLyBPdGhlcndpc2UsIHNlbmQgYSA1MDAgcmVzcG9uc2UuXG4gICAgICAgIGF3YWl0IHNlbmRSZXNwb25zZShub2RlTmV4dFJlcSwgbm9kZU5leHRSZXMsIG5ldyBSZXNwb25zZShudWxsLCB7XG4gICAgICAgICAgICBzdGF0dXM6IDUwMFxuICAgICAgICB9KSk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbn1cblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9YXBwLXJvdXRlLmpzLm1hcFxuIl0sIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fgoogle-drive%2Fstatus%2Froute&page=%2Fapi%2Fgoogle-drive%2Fstatus%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fgoogle-drive%2Fstatus%2Froute.ts&appDir=D%3A%5Casset-manager-vercel-supabase%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=D%3A%5Casset-manager-vercel-supabase&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D&isGlobalNotFoundEnabled=!\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "(ssr)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "../app-render/action-async-storage.external":
/*!*******************************************************************************!*\
  !*** external "next/dist/server/app-render/action-async-storage.external.js" ***!
  \*******************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/action-async-storage.external.js");

/***/ }),

/***/ "../app-render/after-task-async-storage.external":
/*!***********************************************************************************!*\
  !*** external "next/dist/server/app-render/after-task-async-storage.external.js" ***!
  \***********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/after-task-async-storage.external.js");

/***/ }),

/***/ "./work-async-storage.external":
/*!*****************************************************************************!*\
  !*** external "next/dist/server/app-render/work-async-storage.external.js" ***!
  \*****************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-async-storage.external.js");

/***/ }),

/***/ "./work-unit-async-storage.external":
/*!**********************************************************************************!*\
  !*** external "next/dist/server/app-render/work-unit-async-storage.external.js" ***!
  \**********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-unit-async-storage.external.js");

/***/ }),

/***/ "assert":
/*!*************************!*\
  !*** external "assert" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("assert");

/***/ }),

/***/ "buffer":
/*!*************************!*\
  !*** external "buffer" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("buffer");

/***/ }),

/***/ "child_process":
/*!********************************!*\
  !*** external "child_process" ***!
  \********************************/
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("crypto");

/***/ }),

/***/ "events":
/*!*************************!*\
  !*** external "events" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("events");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("http");

/***/ }),

/***/ "http2":
/*!************************!*\
  !*** external "http2" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = require("http2");

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = require("https");

/***/ }),

/***/ "net":
/*!**********************!*\
  !*** external "net" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("net");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "next/dist/shared/lib/no-fallback-error.external":
/*!******************************************************************!*\
  !*** external "next/dist/shared/lib/no-fallback-error.external" ***!
  \******************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/shared/lib/no-fallback-error.external");

/***/ }),

/***/ "next/dist/shared/lib/router/utils/app-paths":
/*!**************************************************************!*\
  !*** external "next/dist/shared/lib/router/utils/app-paths" ***!
  \**************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/shared/lib/router/utils/app-paths");

/***/ }),

/***/ "node:buffer":
/*!******************************!*\
  !*** external "node:buffer" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:buffer");

/***/ }),

/***/ "node:fs":
/*!**************************!*\
  !*** external "node:fs" ***!
  \**************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:fs");

/***/ }),

/***/ "node:http":
/*!****************************!*\
  !*** external "node:http" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:http");

/***/ }),

/***/ "node:https":
/*!*****************************!*\
  !*** external "node:https" ***!
  \*****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:https");

/***/ }),

/***/ "node:net":
/*!***************************!*\
  !*** external "node:net" ***!
  \***************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:net");

/***/ }),

/***/ "node:path":
/*!****************************!*\
  !*** external "node:path" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:path");

/***/ }),

/***/ "node:process":
/*!*******************************!*\
  !*** external "node:process" ***!
  \*******************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:process");

/***/ }),

/***/ "node:stream":
/*!******************************!*\
  !*** external "node:stream" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:stream");

/***/ }),

/***/ "node:stream/web":
/*!**********************************!*\
  !*** external "node:stream/web" ***!
  \**********************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:stream/web");

/***/ }),

/***/ "node:url":
/*!***************************!*\
  !*** external "node:url" ***!
  \***************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:url");

/***/ }),

/***/ "node:util":
/*!****************************!*\
  !*** external "node:util" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:util");

/***/ }),

/***/ "node:zlib":
/*!****************************!*\
  !*** external "node:zlib" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:zlib");

/***/ }),

/***/ "os":
/*!*********************!*\
  !*** external "os" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("os");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ "process":
/*!**************************!*\
  !*** external "process" ***!
  \**************************/
/***/ ((module) => {

"use strict";
module.exports = require("process");

/***/ }),

/***/ "querystring":
/*!******************************!*\
  !*** external "querystring" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("querystring");

/***/ }),

/***/ "stream":
/*!*************************!*\
  !*** external "stream" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("stream");

/***/ }),

/***/ "tls":
/*!**********************!*\
  !*** external "tls" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("tls");

/***/ }),

/***/ "tty":
/*!**********************!*\
  !*** external "tty" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("tty");

/***/ }),

/***/ "url":
/*!**********************!*\
  !*** external "url" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("url");

/***/ }),

/***/ "util":
/*!***********************!*\
  !*** external "util" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("util");

/***/ }),

/***/ "worker_threads":
/*!*********************************!*\
  !*** external "worker_threads" ***!
  \*********************************/
/***/ ((module) => {

"use strict";
module.exports = require("worker_threads");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("zlib");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/googleapis","vendor-chunks/google-auth-library","vendor-chunks/googleapis-common","vendor-chunks/math-intrinsics","vendor-chunks/gaxios","vendor-chunks/es-errors","vendor-chunks/qs","vendor-chunks/jws","vendor-chunks/call-bind-apply-helpers","vendor-chunks/json-bigint","vendor-chunks/google-logging-utils","vendor-chunks/get-proto","vendor-chunks/gcp-metadata","vendor-chunks/object-inspect","vendor-chunks/has-symbols","vendor-chunks/gopd","vendor-chunks/function-bind","vendor-chunks/ecdsa-sig-formatter","vendor-chunks/url-template","vendor-chunks/side-channel","vendor-chunks/side-channel-weakmap","vendor-chunks/side-channel-map","vendor-chunks/side-channel-list","vendor-chunks/safe-buffer","vendor-chunks/jwa","vendor-chunks/hasown","vendor-chunks/get-intrinsic","vendor-chunks/extend","vendor-chunks/es-object-atoms","vendor-chunks/es-define-property","vendor-chunks/dunder-proto","vendor-chunks/call-bound","vendor-chunks/buffer-equal-constant-time","vendor-chunks/bignumber.js","vendor-chunks/base64-js"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fgoogle-drive%2Fstatus%2Froute&page=%2Fapi%2Fgoogle-drive%2Fstatus%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fgoogle-drive%2Fstatus%2Froute.ts&appDir=D%3A%5Casset-manager-vercel-supabase%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=D%3A%5Casset-manager-vercel-supabase&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D&isGlobalNotFoundEnabled=!")));
module.exports = __webpack_exports__;

})();