// proxy.js
const express = require("express");
// Make sure you have installed node-fetch v2: npm install node-fetch@2
const fetch = require('node-fetch');
const cors = require("cors"); // Optional if using manual CORS below

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

// --- Proxy Endpoints ---

// Proxy for Summary List
app.get("/proxy/summary", async (req, res) => {
  const apiUrl = "https://platform.synack.com/api/targets/registered_summary";
  const userToken = req.header("Authorization");
  if (!userToken) return res.status(401).json({ error: "Authorization header missing" });

  console.log("Proxying request to:", apiUrl);

  try {
      const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
              "Authorization": userToken,
              "Accept": "application/json"
          },
      });

      console.log(`Received status ${response.status} from Synack Summary API`);

      const body = await response.text();

      // Check if the response status indicates an error from Synack API itself
      if (!response.ok) {
           console.error(`Synack API Error (Summary): ${response.status} ${response.statusText}`, body);
           return res.status(response.status).send(body);
      }

      res.status(response.status).send(body);

  } catch (error) {
      // Log the detailed error on the *proxy* console
      console.error("******************************************");
      console.error("Proxy Error Details (Summary Route):", error);
      console.error("******************************************");
      // Send a more informative error back to the frontend
      res.status(500).json({
          error: "Proxy request failed",
          message: error.message,
          type: error.type,
          errno: error.errno
       });
  }
});

// Proxy for Target Details
app.get("/proxy/target/:targetId", async (req, res) => {
  const targetId = req.params.targetId;
  const userToken = req.header("Authorization");
  if (!targetId) return res.status(400).json({ error: "Target ID parameter missing" });
  if (!userToken) return res.status(401).json({ error: "Authorization header missing" });

  const apiUrl = `https://platform.synack.com/api/targets/${targetId}`;
  console.log("Proxying request to:", apiUrl); // Log detail request

  try {
      const response = await fetch(apiUrl, {
           headers: { "Authorization": userToken, "Accept": "application/json" }
      });
       console.log(`Received status ${response.status} from Synack Target Detail API for ${targetId}`); // Log detail response status
      const body = await response.text();

      // Check if the response status indicates an error from Synack API itself
      if (!response.ok) {
           console.error(`Synack API Error (Target ${targetId}): ${response.status} ${response.statusText}`, body);
           return res.status(response.status).send(body);
      }

      res.status(response.status).send(body);
  } catch (error) {
      console.error("******************************************");
      console.error(`Proxy Error Details (Target ${targetId} Route):`, error);
      console.error("******************************************");
      res.status(500).json({
          error: "Proxy request failed",
          message: error.message,
          type: error.type,
          errno: error.errno
      });
  }
});

// Fetch ALL Unregistered Targets (Handles Pagination)
app.get("/proxy/unregistered-targets", async (req, res) => {
    const userToken = req.header("Authorization");
    if (!userToken) return res.status(401).json({ error: "Authorization header missing" });

    let allTargets = [];
    let page = 1;
    let next_page = true;
    const baseUrl = "https://platform.synack.com/api/targets?filter%5Bprimary%5D=unregistered&filter%5Bsecondary%5D=all&filter%5Bcategory%5D=all&sorting%5Bfield%5D=dateUpdated&sorting%5Bdirection%5D=desc&pagination%5Bpage%5D=";

    console.log("Fetching unregistered targets...");
    try {
        while (next_page) {
            const url = baseUrl + page;
            console.log(`Workspaceing page ${page}...`);
            const apiResponse = await fetch(url, {
                headers: { "Authorization": userToken, "Accept": "application/json" }
            });

            if (!apiResponse.ok) {
                 console.error(`API Error fetching unregistered (Page ${page}): ${apiResponse.status} ${apiResponse.statusText}`);
                 let errorBody = await apiResponse.text();
                 try { errorBody = JSON.parse(errorBody); } catch (e) {}
                 if (apiResponse.status === 401) { throw new Error(`Unauthorized (401) fetching page ${page}`); }
                 next_page = false; // Stop pagination on non-401 error
                 console.warn(`Stopping pagination due to API error on page ${page}.`);
            } else {
                 const pageData = await apiResponse.json();
                 if (pageData && pageData.length > 0) {
                     const relevantData = pageData.map(target => ({
                         slug: target.slug,
                         name: target.name,
                         category: target.category?.name
                     }));
                     allTargets = allTargets.concat(relevantData);
                     console.log(`Page ${page} successful, got ${pageData.length} targets. Total: ${allTargets.length}`);
                     page++;
                 } else {
                     console.log(`Page ${page} empty or invalid data, stopping.`);
                     next_page = false; // Stop when an empty page is received
                 }
            }
             // Optional delay to avoid rate limits
             // await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.log(`Finished fetching. Total unregistered targets found: ${allTargets.length}`);
        res.status(200).json(allTargets); // Send the combined list
    } catch (error) {
        console.error("******************************************");
        console.error("Proxy Error Details (Unregistered Fetch Route):", error);
        console.error("******************************************");
        res.status(500).json({
            error: "Failed to fetch unregistered targets",
            message: error.message,
            type: error.type,
            errno: error.errno
        });
    }
});


// Register a Single Target
app.post("/proxy/register-target/:targetId", async (req, res) => {
    const targetId = req.params.targetId;
    const userToken = req.header("Authorization");
    if (!targetId) return res.status(400).json({ error: "Target ID parameter missing" });
    if (!userToken) return res.status(401).json({ error: "Authorization header missing" });

    const apiUrl = `https://platform.synack.com/api/targets/${targetId}/signup`;
    const payload = { "ResearcherListing": { "terms": 1 } };

    console.log(`Proxying registration POST to: ${apiUrl}`);

    try {
        const apiResponse = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Authorization": userToken,
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        console.log(`Received status ${apiResponse.status} from Synack Register API for ${targetId}`);
        // Send back the status code (could be 200, 204, 409 Conflict, etc.)
        res.sendStatus(apiResponse.status);

    } catch (error) {
        console.error("******************************************");
        console.error(`Proxy Error Details (Register Target ${targetId} Route):`, error);
        console.error("******************************************");
        res.status(500).json({
            error: "Proxy request failed during registration",
            message: error.message,
            type: error.type,
            errno: error.errno
        });
    }
});


// --- Server Start ---
app.listen(PORT, () => {
  console.log(`Proxy server running at http://localhost:${PORT}`);
});