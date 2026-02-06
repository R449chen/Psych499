import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dirPath = path.join(__dirname, 'public', 'images');
const outputFilePath = path.join(__dirname, 'public', 'manifest.json');

const getGroupedFiles = (baseDir) => {
  const manifest = {};
  
  // Get all subdirectories in /public/images
  const folders = fs.readdirSync(baseDir).filter(f => 
    fs.statSync(path.join(baseDir, f)).isDirectory()
  );

  folders.forEach(folder => {
    const folderPath = path.join(baseDir, folder);
    const files = fs.readdirSync(folderPath)
      .filter(file => /\.(jpg|jpeg|png|webp|gif)$/i.test(file))
      .map(file => `/images/${folder}/${file}`); // Path for the browser
    
    if (files.length > 0) {
      manifest[folder] = files;
    }
  });

  return manifest;
};

try {
  const groupedManifest = getGroupedFiles(dirPath);
  fs.writeFileSync(outputFilePath, JSON.stringify(groupedManifest, null, 2));
  console.log(`✅ Success! Organized ${Object.keys(groupedManifest).length} folders into manifest.json`);
} catch (err) {
  console.error('❌ Error:', err.message);
}