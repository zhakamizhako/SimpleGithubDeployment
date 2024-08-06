const express = require('express');
const { exec } = require('child_process');
const bcrypt = require('bcrypt');
const fs = require('fs');
const fsp = require('fs').promises;

const app = express();
const port = 8550;

const loadKey = async () => {
    try {
        const data = await fsp.readFile('key', 'utf8');
        return data.trim();
    } catch (e) {
        throw new Error("Invalid file or missing: " + e);
    }
}

const validate = async (password, hash) => {
    const result = await bcrypt.compare(password, hash);
    return result;
}

app.use(express.json());

app.post('/docker', async (req, res) => {
    const { imageUrl, id, region } = req.body;
    const { key } = req.headers;

    if (!key) {
        console.log(`${new Date()} - ${req.ip}- [GH] Missing Key`);
        return res.status(400).json({ error: 'Missing Key' });
    }

    const apiKey = await loadKey();
    const challenge = Buffer.from(key, 'base64').toString('utf8').trim();
    const validation = await validate(challenge, apiKey);

    if (!validation) {
        console.log(`${new Date()} - ${req.ip}- [GH] Invalid Key`);
        return res.status(400).json({ error: 'Invalid Key' });
    }

    console.log(`${new Date()} - ${req.ip}- [GH] Key valid`);

    if (!id) {
        console.log(`${new Date()} - ${req.ip}- [GH] Missing id`);
        return res.status(400).json({ error: 'Missing id in request body' });
    }

    if (!imageUrl) {
        console.log(`${new Date()} - ${req.ip}- [GH] Missing ImageURL`);
        return res.status(400).json({ error: 'Missing imageUrl in request body' });
    }

    if (!region) {
        console.log(`${new Date()} - ${req.ip}- [GH] Missing Region`);
        return res.status(400).json({ error: 'Missing region in request body' });
    }

    const scriptPath = './docker-restarter.sh';
    const script = `${scriptPath} ${id} ${imageUrl} ${region}`;

    fs.chmod(scriptPath, 0o755, (e) => {
        if (e) {
            console.log("[GH] Unable to set permissions");
            console.log(e);
        }
    });

    console.log(`${new Date()} - [GH] Push Request received - ${id} - ${imageUrl} - ${region}`);

    const child = exec(script);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log(`${new Date()} stdout: ${data}`); // Log the output
    });

    child.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log(`${new Date()} stderr: ${data}`);
    });

    child.on('close', (code) => {
        if (code === 0) {
            console.log('Script completed successfully');
            res.status(200).json({ status: 'ok' });
        } else {
            console.error('Script failed');
            res.status(500).json({ error: stderr });
        }
    });
});

app.listen(port, () => {
    console.log(`[CI/CD] Server is running on http://localhost:${port}`);
});
