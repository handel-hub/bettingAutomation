import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const LEGACY_SALT = 'betting-automation-salt-2026';

function getKey(saltHex) {
    const keyString = process.env.MASTER_KEY;
    if (!keyString) {
        throw new Error('MASTER_KEY environment variable is missing.');
    }
    
    // If salt is provided as hex, convert it to a buffer. Otherwise use the legacy string.
    const salt = saltHex ? Buffer.from(saltHex, 'hex') : LEGACY_SALT;
    return crypto.scryptSync(keyString, salt, 32);
}

export function encrypt(text, aad) {
    const salt = crypto.randomBytes(16);
    const key = getKey(salt.toString('hex'));
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
        salt: salt.toString('hex'),
        encryptedData: encrypted,
        authTag: authTag.toString('hex')
    };
}

export function decrypt(encryptedObj, aad) {
    // Fallback to legacy static salt if the object doesn't have a salt property
    const key = getKey(encryptedObj.salt);
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

