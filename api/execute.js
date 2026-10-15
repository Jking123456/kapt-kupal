const https = require('https');
const crypto = require('crypto');

const BASE_URL = "https://licensdash-nock67rs.manus.space/api/license/validate";
const API_KEY = "NAXX-E87B6-BC5C6-B7F65-DE496-9AEE5";
const PRODUCT = "luajava";
const REQUEST_COUNT = 500; // Number of parallel requests per execution

function generateRandomDeviceId() {
    return crypto.randomBytes(16).toString('hex');
}

function validateLicense(deviceId) {
    return new Promise((resolve) => {
        const queryParams = new URLSearchParams({
            key: API_KEY,
            device_id: deviceId,
            product: PRODUCT
        });

        const url = `${BASE_URL}?${queryParams.toString()}`;

        const req = https.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36' },
            timeout: 4000
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                resolve({ statusCode: res.statusCode, content: data.trim() });
            });
        });

        req.on('error', (err) => {
            resolve({ statusCode: 0, content: err.message });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({ statusCode: 0, content: 'Request timeout' });
        });
    });
}

module.exports = async (req, res) => {
    // Optional: Secure your cron endpoint using Vercel's Cron Secret header if desired
    // if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    //     return res.status(401).json({ error: 'Unauthorized' });
    // }

    let results = [];
    let promises = [];

    for (let i = 0; i < REQUEST_COUNT; i++) {
        const deviceId = generateRandomDeviceId();
        promises.push(
            validateLicense(deviceId).then(result => {
                results.push({ deviceId: deviceId.substring(0, 12), ...result });
            })
        );
    }

    await Promise.all(promises);

    return res.status(200).json({
        success: true,
        executedAt: new Date().toISOString(),
        totalRequests: REQUEST_COUNT,
        results: results
    });
};
