const { networkInterfaces } = require('os');
const { spawnSync } = require('child_process');

const nets = networkInterfaces();
let targetIp = '0.0.0.0';

for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
            targetIp = net.address;
            break; // Grab the first external IPv4 address
        }
    }
    if (targetIp !== '0.0.0.0') break;
}

console.log('\n=========================================');
console.log(`🚀 Starting Next.js bound to Network IP: ${targetIp}`);
console.log('=========================================\n');

spawnSync('npx', ['next', 'dev', '-H', targetIp, '--experimental-https'], { 
    stdio: 'inherit',
    shell: true 
});
