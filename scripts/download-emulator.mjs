import https from 'https';
import fs from 'fs';
import path from 'path';

const url = 'https://storage.googleapis.com/firebase-preview-drop/emulator/cloud-firestore-emulator-v1.19.8.jar';
const destDir = 'C:\\Users\\Chandru\\.cache\\firebase\\emulators';
const destFile = path.join(destDir, 'cloud-firestore-emulator-v1.19.8_valid.jar');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

console.log('Downloading cloud-firestore-emulator-v1.19.8_valid.jar...');
const file = fs.createWriteStream(destFile);

function download(targetUrl) {
  https.get(targetUrl, (res) => {
    if (res.statusCode === 301 || res.statusCode === 302) {
      download(res.headers.location);
      return;
    }
    res.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log('Successfully downloaded Firestore emulator jar!');
      // Copy over to the standard filename
      try {
        fs.copyFileSync(destFile, path.join(destDir, 'cloud-firestore-emulator-v1.19.8.jar'));
        console.log('Copied to standard cloud-firestore-emulator-v1.19.8.jar');
      } catch (e) {
        console.log('Copy note (file busy):', e.message);
      }
    });
  }).on('error', (err) => {
    fs.unlink(destFile, () => {});
    console.error('Download failed:', err.message);
  });
}

download(url);
