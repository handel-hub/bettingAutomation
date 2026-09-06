const cp = require('child_process');
const p = cp.fork('execution/index.mjs', [], { stdio: 'inherit' });
p.send({
    type: 'INITIALIZE',
    payload: {
        settings: { Proxy: {}, Spawning: {} },
        accounts: [],
        proxies: [],
        policy: {}
    }
});
p.on('message', console.log);
setTimeout(() => { p.kill(); console.log('Successfully killed execution process'); }, 2000);
