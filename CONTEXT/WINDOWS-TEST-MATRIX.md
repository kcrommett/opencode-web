# Windows Testing Matrix

This document defines the test matrix for Windows scenarios to validate the bunx limitation detection and workarounds.

## Test Scenarios

### Scenario 1: Windows + bunx (Expected to Fail Gracefully)

**Platform**: Windows 10/11  
**Command**: `bunx opencode-web@latest`  
**Expected Behavior**:
- ❌ Should **NOT** start the bundled OpenCode Server
- ✅ Should detect bunx temporary directory pattern
- ✅ Should exit with clear error message
- ✅ Should display all recommended workarounds

**Validation Steps**:
1. Run `bunx opencode-web@latest`
2. Verify error message appears:
   ```
   [ERROR] Cannot launch bundled OpenCode Server via 'bunx' on Windows.
   ```
3. Verify workarounds are displayed (3 options)
4. Verify exit code is 1
5. Confirm no server process was spawned

**Success Criteria**:
- Clear error message displayed
- No misleading stack traces
- Exit code: 1
- No hanging processes

---

### Scenario 2: Windows + bunx + External Server (Expected to Work)

**Platform**: Windows 10/11  
**Prerequisites**: 
- OpenCode CLI installed
- OpenCode server running: `opencode serve --hostname=127.0.0.1 --port=4096`

**Command**: `bunx opencode-web@latest --external-server http://127.0.0.1:4096`  
**Expected Behavior**:
- ✅ Should skip bundled server launch
- ✅ Should connect to external server
- ✅ Should display confirmation message
- ✅ Should start web UI successfully

**Validation Steps**:
1. Start OpenCode server: `opencode serve --hostname=127.0.0.1 --port=4096`
2. Run `bunx opencode-web@latest --external-server http://127.0.0.1:4096`
3. Verify confirmation message:
   ```
   ℹ️ Using external OpenCode Server: http://127.0.0.1:4096
      (External server is required when using 'bunx' on Windows)
   ```
4. Verify web UI starts on http://127.0.0.1:3000
5. Open browser and test basic functionality
6. Check browser DevTools → Network for `/api/events` SSE connection

**Success Criteria**:
- No errors in console
- Web UI accessible
- SSE events flowing
- Exit code: 0 (clean exit on Ctrl+C)

---

### Scenario 3: Windows + Local Install (Expected to Work)

**Platform**: Windows 10/11  
**Command**: 
```powershell
bun install opencode-web
bun run packages/opencode-web/bin/opencode-web.js
```

**Expected Behavior**:
- ✅ Should auto-launch bundled OpenCode Server
- ✅ Should start web UI successfully
- ✅ Should work without `--external-server` flag

**Validation Steps**:
1. Install locally: `bun install opencode-web`
2. **IMPORTANT**: Run binary directly: `bun run packages/opencode-web/bin/opencode-web.js`
3. Verify server launch message:
   ```
   Starting local OpenCode Server (Windows)...
   OpenCode Server 1.0.x listening at http://127.0.0.1:4096
   ```
4. Verify web UI starts successfully
5. Test full functionality (session creation, file operations, etc.)

**Success Criteria**:
- OpenCode Server auto-launches
- Web UI accessible
- All features functional
- Exit code: 0 (clean exit on Ctrl+C)

**Important Note**: Using `bun run opencode-web` (npm script) may still fail with `/bin/sh` error. You must run binary directly on Windows.

---

### Scenario 4: Windows + Source Build (Expected to Work)

**Platform**: Windows 10/11  
**Command**: 
```powershell
git clone https://github.com/sst/opencode-web
cd opencode-web
bun install
bun run build
bun run packages/opencode-web/bin/opencode-web.js
```

**Expected Behavior**:
- ✅ Should build successfully
- ✅ Should auto-launch bundled OpenCode Server
- ✅ Should start web UI successfully

**Validation Steps**:
1. Clone and build from source
2. Run `bun run packages/opencode-web/bin/opencode-web.js`
3. Verify server launch and web UI startup
4. Test full functionality

**Success Criteria**:
- Build completes without errors
- Server auto-launches
- Web UI accessible
- All features functional

---

### Scenario 5: macOS/Linux + bunx (Control - Expected to Work)

**Platform**: macOS or Linux  
**Command**: `bunx opencode-web@latest`  
**Expected Behavior**:
- ✅ Should auto-launch bundled SDK server
- ✅ Should NOT show Windows bunx error
- ✅ Should start web UI successfully

**Validation Steps**:
1. Run `bunx opencode-web@latest`
2. Verify server launch via SDK (not Windows CLI)
3. Verify web UI starts successfully
4. Confirm no Windows-specific warnings

**Success Criteria**:
- No Windows-specific errors
- Server auto-launches via SDK
- Web UI accessible
- Exit code: 0

---

## Test Matrix Summary

| Scenario | Platform | Install Method | Server Launch | Expected Result | Priority |
|----------|----------|----------------|---------------|-----------------|----------|
| 1 | Windows | bunx | Auto (blocked) | Graceful error + guidance | High |
| 2 | Windows | bunx | External | Success with confirmation | High |
| 3 | Windows | Local install | Auto | Success | High |
| 4 | Windows | Source build | Auto | Success | Medium |
| 5 | macOS/Linux | bunx | Auto (SDK) | Success | Medium |

## Automated Test Script

See `CONTEXT/WINDOWS-TEST-SMOKE.ps1` for automated validation of Scenarios 1-3.

## Manual Testing Checklist

When testing manually, verify:

- [ ] Error messages are clear and actionable
- [ ] No sensitive information exposed in logs
- [ ] Exit codes are correct (1 for errors, 0 for success)
- [ ] No hanging processes after exit
- [ ] SSE events flowing when server is connected
- [ ] Browser console shows no errors (except expected CORS in dev)
- [ ] All three workarounds documented in error message work
- [ ] Performance is acceptable (startup < 5 seconds)

## Known Issues & Workarounds

### Issue: Port 4096 already in use

**Symptom**: `Error: listen EADDRINUSE: address already in use`  
**Workaround**: Use a different port:
```powershell
opencode serve --hostname=127.0.0.1 --port=4097
bunx opencode-web@latest --external-server http://127.0.0.1:4097
```

### Issue: Firewall blocking localhost

**Symptom**: `ECONNREFUSED` in browser console  
**Workaround**: Add firewall rule for Bun and OpenCode executables

### Issue: `localhost` vs `127.0.0.1`

**Symptom**: Connection works with one but not the other  
**Workaround**: Always use `127.0.0.1` on Windows for consistency

## Reporting Test Results

When reporting test results, include:
- Windows version (10/11, build number)
- Bun version (`bun --version`)
- OpenCode version (`opencode --version`)
- Test scenario number
- Full console output (if failure)
- Browser DevTools errors (if applicable)

## Regression Testing

After any changes to:
- `packages/opencode-web/bin/opencode-web.js`
- `README.md` Windows instructions
- `server.ts` proxy implementation

Re-run **all** scenarios to ensure no regressions.
