const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const srcApk = path.join(__dirname, '..', 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const rootDestApk = path.join(__dirname, '..', 'Universal-Attendance-debug.apk');
const artifactDestApk = 'C:\\Users\\boyin\\.gemini\\antigravity\\brain\\f0550959-06dd-4361-b86e-612e9b9bca44\\Universal-Attendance-debug.apk';

console.log('Source APK:', srcApk);
if (fs.existsSync(srcApk)) {
  fs.copyFileSync(srcApk, rootDestApk);
  console.log('Copied to Root:', rootDestApk);

  fs.copyFileSync(srcApk, artifactDestApk);
  console.log('Copied to Artifact Store:', artifactDestApk);

  const buffer = fs.readFileSync(srcApk);
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  console.log('APK Size:', buffer.length, 'bytes');
  console.log('APK SHA-256:', hash);
} else {
  console.error('Source APK not found at:', srcApk);
}
