const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// A very hacky way to find the blob for 'server/index.ts'
// Just read all objects, inflate them, and see if they look like the server index.ts file.
// Or even better, let's just find the largest blob that contains 'app.post("/api/payment/verify_upi"'
const objectsDir = path.join(process.cwd(), '.git', 'objects');

let bestMatch = null;
let bestMatchSize = 0;
let bestMatchContent = '';

function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const f of files) {
        if (f === 'info' || f === 'pack') continue;
        const fullPath = path.join(dir, f);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            const blobs = fs.readdirSync(fullPath);
            for (const b of blobs) {
                const blobPath = path.join(fullPath, b);
                try {
                    const compressed = fs.readFileSync(blobPath);
                    const decompressed = zlib.inflateSync(compressed);
                    const content = decompressed.toString('utf8');
                    // Check if it's a blob
                    if (content.startsWith('blob ')) {
                        // It's a blob, extract content
                        const nullIdx = content.indexOf('\0');
                        const actualContent = content.substring(nullIdx + 1);
                        
                        if (actualContent.includes("app.post('/api/payment/verify_upi'") && 
                            actualContent.includes("app.post('/api/client/register'")) {
                            if (actualContent.length > bestMatchSize) {
                                bestMatchSize = actualContent.length;
                                bestMatchContent = actualContent;
                            }
                        }
                    }
                } catch (e) {
                    // Ignore errors (might not be zlib or permission denied)
                }
            }
        }
    }
}

scanDir(objectsDir);

if (bestMatchContent) {
    fs.writeFileSync(path.join(process.cwd(), 'server', 'index.ts.recovered'), bestMatchContent);
    console.log(`Recovered file with length ${bestMatchContent.length}`);
} else {
    console.log("No match found in loose objects. Might be in pack file.");
}
