const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'crash_report.txt');

function log(msg) {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
}

log('--- STARTING DEBUG SESSION ---');

try {
    log('1. Loading security config...');
    try {
        const { SECURITY_CONFIG } = require('./config/security.config');
        log('   Security config loaded. Port: ' + SECURITY_CONFIG?.PORT);
    } catch (e) { throw new Error('Failed loading security.config: ' + e.message); }

    log('2. Loading middleware/security...');
    try { require('./middleware/security'); log('   OK'); } catch (e) { throw new Error('Failed middleware/security: ' + e.message); }

    log('3. Loading middleware/rateLimiter...');
    try { require('./middleware/rateLimiter'); log('   OK'); } catch (e) { throw new Error('Failed middleware/rateLimiter: ' + e.message); }

    log('4. Loading middleware/validator...');
    try { require('./middleware/validator'); log('   OK'); } catch (e) { throw new Error('Failed middleware/validator: ' + e.message); }

    log('5. Loading middleware/sanitizer...');
    try { require('./middleware/sanitizer'); log('   OK'); } catch (e) { throw new Error('Failed middleware/sanitizer: ' + e.message); }

    log('6. Loading utils/logger...');
    try { require('./utils/logger'); log('   OK'); } catch (e) { throw new Error('Failed utils/logger: ' + e.message); }

    log('7. Loading config/database...');
    try { require('./config/database'); log('   OK'); } catch (e) { throw new Error('Failed config/database: ' + e.message); }

    log('8. Loading middleware/auth...');
    try { require('./middleware/auth'); log('   OK'); } catch (e) { throw new Error('Failed middleware/auth: ' + e.message); }

    log('9. Loading middleware/errorHandler...');
    try { require('./middleware/errorHandler'); log('   OK'); } catch (e) { throw new Error('Failed middleware/errorHandler: ' + e.message); }

    log('10. Loading routes/chat...');
    try { require('./routes/chat'); log('   OK'); } catch (e) { throw new Error('Failed routes/chat: ' + e.message); }

    log('11. Loading routes/auth...');
    try { require('./routes/auth'); log('   OK'); } catch (e) { throw new Error('Failed routes/auth: ' + e.message); }

    log('12. Loading routes/auth_v2...');
    try { require('./routes/auth_v2'); log('   OK'); } catch (e) { throw new Error('Failed routes/auth_v2: ' + e.message); }

    log('13. Loading routes/ocr...');
    try { require('./routes/ocr'); log('   OK'); } catch (e) { throw new Error('Failed routes/ocr: ' + e.message); }

    log('✅ All modules loaded successfully!');
} catch (error) {
    log('❌ CRASH DETECTED!');
    log(error.stack);
}
