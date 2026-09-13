import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const srcApk = 'd:\\Univarsal Attandance\\worker-management-system\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk';
const rootApk = 'd:\\Univarsal Attandance\\worker-management-system\\Universal-Attendance-debug.apk';
const downloadsApk = 'C:\\Users\\boyin\\Downloads\\Universal-Attendance-debug.apk';
const artifactApk = 'C:\\Users\\boyin\\.gemini\\antigravity\\brain\\f0550959-06dd-4361-b86e-612e9b9bca44\\Universal-Attendance-debug.apk';

function getSha256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex').toUpperCase();
}

console.log('Source APK exists:', fs.existsSync(srcApk));
if (fs.existsSync(srcApk)) {
  const stat = fs.statSync(srcApk);
  console.log('Source APK Size:', stat.size, 'bytes');

  fs.copyFileSync(srcApk, rootApk);
  fs.copyFileSync(srcApk, downloadsApk);
  fs.copyFileSync(srcApk, artifactApk);

  const rootHash = getSha256(rootApk);
  const dlHash = getSha256(downloadsApk);
  const artHash = getSha256(artifactApk);

  console.log('Root APK Hash:', rootHash);
  console.log('Downloads APK Hash:', dlHash);
  console.log('Artifact APK Hash:', artHash);
  console.log('Hashes match perfectly:', rootHash === dlHash && dlHash === artHash);
}
