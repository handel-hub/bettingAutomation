import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const SALT = 'betting-automation-salt-2026';

function getKey() {
    const keyString = process.env.MASTER_KEY;
    if (!keyString) {
        throw new Error('MASTER_KEY environment variable is missing.');
    }
    
    return crypto.scryptSync(keyString, SALT, 32);
}

export function encrypt(text, aad) {
    const key = getKey();
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

export function decrypt(encryptedObj, aad) {
    const key = getKey();
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
