import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { encrypt, decrypt } from '../src/utils/crypto.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

// Load environment variables so crypto.mjs has access to process.env.MASTER_KEY
dotenv.config({ path: path.join(ROOT_DIR, '.env') });

function upgradeFile(filePath, aad) {
    if (!fs.existsSync(filePath)) {
        return;
    }

    try {
        const encryptedDataStr = fs.readFileSync(filePath, 'utf8');
        const encryptedObj = JSON.parse(encryptedDataStr);
        
        // If it already has a salt, it's been upgraded or freshly encrypted
        if (encryptedObj.salt) {
            console.log(`Already has salt, skipping: ${filePath}`);
            return;
        }

        const decryptedText = decrypt(encryptedObj, aad);
        const newEncryptedObj = encrypt(decryptedText, aad);
        
        fs.writeFileSync(filePath, JSON.stringify(newEncryptedObj, null, 2), 'utf8');
        console.log(`Successfully upgraded salt for: ${filePath}`);
    } catch (e) {
        console.error(`Failed to upgrade ${filePath}:`, e.message);
    }
}

// 1. Upgrade accounts.enc
upgradeFile(path.join(ROOT_DIR, 'accounts.enc'), 'accounts');

// 2. Upgrade sessions/*.json
const sessionsDir = path.join(ROOT_DIR, 'sessions');
if (fs.existsSync(sessionsDir)) {
    const files = fs.readdirSync(sessionsDir);
    for (const file of files) {
        if (file.endsWith('.json')) {
            const username = path.basename(file, '.json');
            upgradeFile(path.join(sessionsDir, file), username);
        }
    }
}
