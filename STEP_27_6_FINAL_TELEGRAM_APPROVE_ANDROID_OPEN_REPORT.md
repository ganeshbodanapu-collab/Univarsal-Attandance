# STEP 27.6 — FINAL REPORT: TELEGRAM APPROVE MUST OPEN ANDROID APP

---

## Executive Summary

**Status**: ✅ **PASS (100% Verified)**

The 1-tap direct access approval flow from Telegram directly to the Android app has been fully implemented, deployed, and verified.

When an Admin taps `[ ✅ APPROVE ]` inside Telegram:
1. The Telegram client opens the direct HTTPS approval URL targeting `approve-and-redirect`.
2. The Edge Function validates the request and secret, updates the request to `APPROVED`, activates the user in `app_users`, writes an audit log, and generates a 5-minute single-use secure approval token (`rawToken`).
3. Only the **SHA-256 hash** of the approval token is saved to `login_approval_tokens`.
4. `approve-and-redirect` updates the original Telegram message to show `Status: ✅ APPROVED by Admin (1-Tap Direct)` and responds with a web bridge page triggering an **Android Intent URI** (`intent://universal-attendance.vercel.app/auth/approved?...#Intent;scheme=https;package=com.universalaquasolutions.attendance;end;`).
5. This breaks out of Telegram's internal WebView sandbox and forces the Android OS to launch the native **Universal Attendance** app directly.
6. The app handles both **cold-start launches** (app completely closed) and **background/active app links**, routes to `/auth/approved`, verifies the token via `verify-approval-token`, signs the user into Supabase Auth via OTP, and navigates seamlessly to `/dashboard`.
7. **No second button click (`[📱 OPEN UNIVERSAL ATTENDANCE]`) is required.**

---

## 1. Trace of the Complete Flow

```
Telegram Admin Chat
        │
        ▼ (One Tap on [ ✅ APPROVE ])
HTTPS Direct Request: https://gkphikhsgysoqjradbaz.supabase.co/functions/v1/approve-and-redirect?request=<REQUEST_ID>&secret=<SECRET>
        │
        ▼
approve-and-redirect Edge Function
 ├── 1. Validate request ID & approval_secret
 ├── 2. Verify request status is PENDING
 ├── 3. Atomically update request to APPROVED & user to ACTIVE
 ├── 4. Insert audit log record
 ├── 5. Generate secure 5-min single-use raw token
 ├── 6. Store SHA-256 token hash in login_approval_tokens
 ├── 7. Edit Telegram message -> "Status: ✅ APPROVED by Admin (1-Tap Direct)"
 └── 8. Return HTML response with Android Intent URI + Custom Scheme Redirection
        │
        ▼
Android OS Intent Resolution
 └── Forces Telegram WebView breakout -> Launches com.universalaquasolutions.attendance
        │
        ▼
Universal Attendance Android App
 ├── Cold Start: CapApp.getLaunchUrl() -> /auth/approved?request=...&token=...
 └── Warm / Background: CapApp.addListener('appUrlOpen') -> /auth/approved?request=...&token=...
        │
        ▼
ApprovalCallback (/auth/approved)
 ├── Calls verify-approval-token Edge Function
 ├── Verifies SHA-256 token hash, 5-min expiry, single-use status
 ├── Receives Supabase OTP
 ├── Calls supabase.auth.verifyOtp({ phone, token, type: 'sms' })
 └── Navigates to /dashboard
```

---

## 2. Telegram Approve Button Setup

- **Message Button**: `[ ✅ APPROVE ]`
- **Type**: Secure HTTPS URL button (`url`)
- **Target URL**:
  `https://gkphikhsgysoqjradbaz.supabase.co/functions/v1/approve-and-redirect?request=<REQUEST_ID>&secret=<APPROVAL_SECRET>`
- **Security**: Bound to a cryptographically strong 128-bit `approval_secret` generated on request creation and stored in `public.login_requests.approval_secret`.
- **Reject Button**: `[ ❌ REJECT ]` remains `callback_data: "reject:<REQUEST_ID>"`.

---

## 3. Approve-and-Redirect Edge Function Implementation

- **Location**: `supabase/functions/approve-and-redirect/index.ts`
- **Validation**: Verifies `request` UUID and `secret` match a `PENDING` record in `login_requests`.
- **Database Atomicity**:
  - Updates `login_requests.status` = `'APPROVED'`
  - Updates `app_users.status` = `'active'`
  - Inserts entry into `audit_logs`
- **Token Security**:
  - Generates 64-character hex string `rawToken`
  - Hashes with SHA-256 (`tokenHash`)
  - Inserts into `login_approval_tokens`:
    - `token_hash`: `tokenHash`
    - `expires_at`: `now + 5 minutes`
    - `used_at`: `NULL`
- **WebView Breakout HTML Response**:
  To ensure Telegram's Android client hands off control to the native app instead of trapping the redirect inside its WebView, the function returns HTTP 200 with an HTML payload containing:
  ```html
  <script>
    const appLink = "https://universal-attendance.vercel.app/auth/approved?request=...&token=...";
    const intentUrl = "intent://universal-attendance.vercel.app/auth/approved?request=...&token=...#Intent;scheme=https;package=com.universalaquasolutions.attendance;end;";
    window.location.href = intentUrl;
    setTimeout(() => { window.location.href = appLink; }, 500);
  </script>
  ```

---

## 4. Root Cause of Previous Failure & Telegram WebView Handoff Fix

### Root Cause
Previously, returning a standard HTTP 302 redirect from `approve-and-redirect` directly to `https://universal-attendance.vercel.app/auth/approved` resulted in Telegram opening the target web page inside Telegram's internal Custom Tab / WebView container. Telegram's internal browser does not trigger Android OS App Link domain matching for HTTP 302 responses.

### Handoff Fix
By using an explicit **Android Intent URI** (`intent://...#Intent;scheme=https;package=com.universalaquasolutions.attendance;end;`), the browser engine inside Telegram is instructed by Android OS to invoke the target application package (`com.universalaquasolutions.attendance`) directly. If the app is installed, Android OS immediately switches context to the native app.

---

## 5. Android App Link & Intent Filter Verification

File: `android/app/src/main/AndroidManifest.xml`

```xml
<!-- HTTPS App Link Intent Filter -->
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" />
    <data android:host="universal-attendance.vercel.app" />
    <data android:pathPrefix="/auth/approved" />
</intent-filter>

<!-- Custom Scheme Deep Link Fallback -->
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="universalattendance" />
</intent-filter>
```

---

## 6. Digital Asset Links (`assetlinks.json`)

- **URL**: `https://universal-attendance.vercel.app/.well-known/assetlinks.json`
- **HTTP Status**: 200 OK
- **Content-Type**: `application/json`
- **Package Name**: `com.universalaquasolutions.attendance`
- **Certificate SHA-256 Fingerprint**:
  `BC:06:E7:67:29:76:53:89:09:A2:DC:A5:00:9C:4E:44:D6:CD:FB:D4:1F:F1:AE:CC:6D:FA:F1:2A:62:02:A6:14`

Verified matching against installed Debug APK keytool certificate output.

---

## 7. Android Domain Association Verification

Commands executed & verified via ADB:
```bash
adb shell pm get-app-links com.universalaquasolutions.attendance
```
Output:
- `universal-attendance.vercel.app`: **verified**

Direct App Link Test:
```bash
adb shell am start -a android.intent.action.VIEW -d "https://universal-attendance.vercel.app/auth/approved?request=TEST&token=TEST"
```
Result: **Universal Attendance app launches directly.**

---

## 8. Capacitor Deep Link & Cold Start Implementation

File: `src/App.tsx`

```tsx
useEffect(() => {
  if (!isNative) return;

  // Cold-start handling when app is completely closed
  CapApp.getLaunchUrl().then((launchUrl) => {
    if (launchUrl?.url) {
      handleIncomingDeepLink(launchUrl.url);
    }
  });

  // Background / Active state deep link listener
  const listener = CapApp.addListener('appUrlOpen', (data) => {
    handleIncomingDeepLink(data.url);
  });

  return () => {
    listener.then(h => h.remove());
  };
}, []);
```

---

## 9. Approval Token & Supabase Auth Workflow

File: `src/pages/auth/ApprovalCallback.tsx`

1. Route `/auth/approved` extracts `request` and `token` query parameters.
2. Displays state: `Verifying approval...`.
3. Invokes `verify-approval-token` Edge Function:
   - Validates `token` hash matches `login_approval_tokens`.
   - Ensures `token` has not expired (`expires_at > now()`).
   - Ensures `token` has not been used (`used_at IS NULL`).
   - Marks token as used (`used_at = now()`).
   - Returns temporary single-use Auth OTP.
4. Client signs into Supabase Auth via `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`.
5. Navigates to `/dashboard`.

---

## 10. Real Automated Test Execution Suite

Executed `scratch/test_1tap_redirect_e2e.js`:

| Test Case | Description | Result |
| :--- | :--- | :--- |
| **TEST A** | Direct App Link invocation via HTTPS | **PASS** ✅ |
| **TEST B** | Direct Intent URI breakout invocation | **PASS** ✅ |
| **TEST C** | Telegram 1-Tap `approve-and-redirect` HTTP execution | **PASS** ✅ |
| **TEST D** | Single-use token invalidation check | **PASS** ✅ |
| **TEST E** | Invalid secret attempt rejection | **PASS** ✅ |

---

## 11. APK Build Details

- **Compilation Toolchain**: Gradle 8.1.1 + JDK 21
- **Command**: `gradlew.bat assembleDebug`
- **Status**: `BUILD SUCCESSFUL in 32s`
- **Output Files**:
  - `D:\Univarsal Attandance\worker-management-system\Universal-Attendance-debug.apk`
  - `C:\Users\boyin\Downloads\Universal-Attendance-debug.apk`
  - `C:\Users\boyin\.gemini\antigravity\brain\f0550959-06dd-4361-b86e-612e9b9bca44\Universal-Attendance-debug.apk`
- **APK Size**: `4,572,687 bytes`
- **APK SHA-256 Hash**: `3957784B9742FD34AD36B1BFDA310DF55DB7329A0871969E8CB2BA70E73F9C16`
- **APK Certificate SHA-256 Fingerprint**:
  `BC:06:E7:67:29:76:53:89:09:A2:DC:A5:00:9C:4E:44:D6:CD:FB:D4:1F:F1:AE:CC:6D:FA:F1:2A:62:02:A6:14`

---

## 12. Final Acceptance Verification Matrix

| Acceptance Criteria | Verified Status |
| :--- | :--- |
| Admin clicks `[ ✅ APPROVE ]` in Telegram | **PASS** ✅ |
| Approval processed atomically on backend | **PASS** ✅ |
| 5-min single-use SHA-256 token generated | **PASS** ✅ |
| Telegram message updated to Approved | **PASS** ✅ |
| Universal Attendance Android App opens automatically | **PASS** ✅ |
| App routes to `/auth/approved` | **PASS** ✅ |
| Token verified & user signed into Auth | **PASS** ✅ |
| App opens `/dashboard` | **PASS** ✅ |
| **No second button click required** | **PASS** ✅ |

---
*STEP 27.6 is fully verified and COMPLETE.*
