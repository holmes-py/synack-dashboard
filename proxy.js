// proxy.js (v2.2+ state - updated summary route)
const express = require("express");
const fetch = require('node-fetch'); // Ensure node-fetch@2 is installed: npm install node-fetch@2
const cors = require("cors"); // Optional: npm install cors

const app = express();
const PORT = 3000;

// --- CORS Middleware ---
app.use((req, res, next) => {
  const allowedOrigin = req.headers.origin;
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin || "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept");
  if (req.method === 'OPTIONS') { return res.sendStatus(204); }
  next();
});

// --- Helper Function for API Calls ---
async function proxyApiRequest(req, res, apiUrl, method = 'GET', payload = null) {
    const userToken = req.header("Authorization");
    if (!userToken) return res.status(401).json({ error: "Authorization header missing" });

    console.log(`Proxying ${method} request to: ${apiUrl}`);
    const options = {
        method: method,
        headers: {
            "Authorization": userToken,
            "Accept": "application/json"
        },
        // Add timeout?
    };

    if (payload && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(payload);
    }

    try {
        const response = await fetch(apiUrl, options);
        console.log(`Received status ${response.status} from ${apiUrl}`);
        const body = await response.text(); // Read body once

        let responseBodyToSend = body;
        // Attempt to parse JSON only if status is OK and content type suggests JSON
        if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
            try {
                responseBodyToSend = JSON.parse(body); // Parse only if looks like JSON and status OK
            } catch(e) {
                 console.warn("Failed to parse supposedly JSON response as JSON, sending as text.");
            }
        } else if (!response.ok) {
             // For errors, still try to parse as JSON might contain error details
             console.error(`Synack API Error: ${response.status} ${response.statusText}`, body);
             try { responseBodyToSend = JSON.parse(body); } catch(e) {}
        }

        // Send status and appropriate body (JSON or text)
        if (typeof responseBodyToSend === 'object') {
             // Send JSON if parsing was successful (or if error body was JSON)
             res.status(response.status).json(responseBodyToSend);
        } else {
             // Send status code only for success cases without text content (e.g., 204)
             if (response.ok && !body) {
                 res.sendStatus(response.status);
             } else {
                 // Send as text otherwise (could be success with non-JSON body, or error with non-JSON body)
                 res.status(response.status).send(responseBodyToSend);
             }
        }

    } catch (error) {
        console.error("******************************************");
        console.error(`Proxy Error Details (${method} ${apiUrl}):`, error);
        console.error("******************************************");
        res.status(500).json({
            error: "Proxy request failed",
            message: error.message, type: error.type, errno: error.errno
        });
    }
}

// --- Proxy Endpoints ---

// UPDATED Proxy for Summary Table (Uses detailed /api/targets endpoint - page 1 only)
app.get("/proxy/summary", (req, res) => {
    const params = new URLSearchParams({
        'filter[primary]': 'registered',
        'filter[secondary]': 'all',
        'filter[category]': 'all',
        'filter[industry]': 'all',
        'filter[payout_status]': 'all',
        'sorting[field]': 'onboardedAt', // Default sort
        'sorting[direction]': 'desc',
        'pagination[page]': '1',
        'pagination[per_page]': '248' // Fetch a large number for page 1
    });
    const apiUrl = `https://platform.synack.com/api/targets?${params.toString()}`;
    proxyApiRequest(req, res, apiUrl);
});

// Target Details Route
app.get("/proxy/target/:targetId", (req, res) => {
    const targetId = req.params.targetId;
    if (!targetId) return res.status(400).json({ error: "Target ID parameter missing" });
    proxyApiRequest(req, res, `https://platform.synack.com/api/targets/${targetId}`);
});

// Target Analytics Route
app.get("/proxy/analytics/:targetId", (req, res) => {
    const targetId = req.params.targetId;
    let statusFilter = req.query.status;
    const validApiStatuses = ['accepted', 'in_queue', 'rejected'];
    if (!targetId) return res.status(400).json({ error: "Target ID parameter missing" });
    if (!statusFilter || !validApiStatuses.includes(statusFilter)) { statusFilter = 'accepted'; }
    proxyApiRequest(req, res, `https://platform.synack.com/api/listing_analytics/categories?listing_id=${targetId}&status=${statusFilter}`);
});

// Unregistered Targets Route (for manual registration button)
app.get("/proxy/unregistered-targets", (req, res) => {
    const apiUrl = "https://platform.synack.com/api/targets?filter%5Bprimary%5D=unregistered&filter%5Bsecondary%5D=all&filter%5Bcategory%5D=all&filter%5Bindustry%5D=all&filter%5Bpayout_status%5D=all&sorting%5Bfield%5D=onboardedAt&sorting%5Bdirection%5D=desc&pagination%5Bpage%5D=1&pagination%5Bper_page%5D=50";
    proxyApiRequest(req, res, apiUrl);
});

// Register Target Route
app.post("/proxy/register-target/:slug", (req, res) => {
    const slug = req.params.slug;
    if (!slug) return res.status(400).json({ error: "Target slug parameter missing" });
    const payload = {"ResearcherListing": {"terms": 1}};
    proxyApiRequest(req, res, `https://platform.synack.com/api/targets/${slug}/signup`, 'POST', payload);
});

// --- Server Start ---
app.listen(PORT, () => {
  console.log(`Proxy server (v2.2+ state) running at http://localhost:${PORT}`);
});