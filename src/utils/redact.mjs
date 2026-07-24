export function redactUsername(username) {
    if (!username) return 'unknown';
    
    if (process.env.LOG_SENSITIVE === 'true') {
        return username;
    }
    
    if (username.length <= 2) {
        return '*'.repeat(username.length);
    }
    
    return `${username[0]}${'*'.repeat(Math.max(1, username.length - 2))}${username[username.length - 1]}`;
}
