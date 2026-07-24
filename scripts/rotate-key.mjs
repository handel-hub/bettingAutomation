import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

const OLD_KEY_STRING = 'my_super_secret_encryption_key_for_testing';
// Read the new key from the converted .env
const envContent = fs.readFileSync(path.join(ROOT_DIR, '.env'), 'utf8');
const match = envContent.match(/^MASTER_KEY=(.*)$/m);
if (!match || !match[1]) {
    console.error('Failed to parse new MASTER_KEY from .env');
    process.exit(1);
}
const NEW_KEY_STRING = match[1].trim();

const ALGORITHM = 'aes-256-gcm';
const SALT = 'betting-automation-salt-2026';

function getCryptoKey(keyString) {
    return crypto.scryptSync(keyString, SALT, 32);
}

const oldKey = getCryptoKey(OLD_KEY_STRING);
const newKey = getCryptoKey(NEW_KEY_STRING);

function decrypt(encryptedObj, key, aad) {
    const iv = Buffer.from(encryptedObj.iv, 'hex');
    const authTag = Buffer.from(encryptedObj.authTag, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    if (aad) {
        decipher.setAAD(Buffer.from(aad, 'utf8'));
    }
    
    let decrypted = decipher.update(encryptedObj.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

function encrypt(text, key, aad) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    if (aad) {
        cipher.setAAD(Buffer.from(aad, 'utf8'));
    }
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
        iv: iv.toString('hex'),
        encryptedData: encrypted,
        authTag: authTag.toString('hex')
    };
}

function rotateFile(filePath, aad) {
    if (!fs.existsSync(filePath)) {
        console.log(`Skipping missing file: ${filePath}`);
        return;
    }

    try {
        const encryptedDataStr = fs.readFileSync(filePath, 'utf8');
        const encryptedObj = JSON.parse(encryptedDataStr);
        
        const decryptedText = decrypt(encryptedObj, oldKey, aad);
        const newEncryptedObj = encrypt(decryptedText, newKey, aad);
        
        fs.writeFileSync(filePath, JSON.stringify(newEncryptedObj, null, 2), 'utf8');
        console.log(`Successfully rotated: ${filePath}`);
    } catch (e) {
        console.error(`Failed to rotate ${filePath}:`, e.message);
    }
}

// 1. Rotate accounts.enc
rotateFile(path.join(ROOT_DIR, 'accounts.enc'), 'accounts');

// 2. Rotate sessions/*.json
const sessionsDir = path.join(ROOT_DIR, 'sessions');
if (fs.existsSync(sessionsDir)) {
    const files = fs.readdirSync(sessionsDir);
    for (const file of files) {
        if (file.endsWith('.json')) {
            const username = path.basename(file, '.json');
            rotateFile(path.join(sessionsDir, file), username);
        }
    }
} else {
    console.log('No sessions directory found.');
}
