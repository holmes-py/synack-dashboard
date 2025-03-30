# Synack Dashboard Helper

A simple web dashboard to view Synack target summaries, view target details (including scope and rules), and automate registration for available targets you qualify for. This tool uses a Node.js (Express) proxy server to handle API requests and CORS, with a vanilla HTML/CSS/JavaScript frontend.
* **Credits:** Google Gemini Advanced 2.5 Pro, and my subpar manipulation skills. 


## Features

* **View Registered Target Summary:** Displays a sortable, searchable, and filterable table of targets you are currently registered for.
* **Column Filtering:** Dynamically show or hide columns in the summary table.
* **View Target Details:** Click a "Details" button to view comprehensive information (Description, Scope/Details, Rules, RoE, basic metadata) for a specific target in a split-pane view.
* **Markdown Rendering:** Renders Markdown content found in target details (Description, Scope, Rules) for better readability.
* **Automated Registration:** Fetches all unregistered targets you are eligible for (based on a configurable list of passed assessment types) and automatically attempts to register for them.
* **Registration Logging:** Displays real-time progress and success/error logs during the automated registration process.
* **Modern UI:** A clean, responsive-style interface using CSS Flexbox.

## Prerequisites

* **Node.js & npm:** You need Node.js (which includes npm) installed on your system to run the proxy server. Version 12 or higher is recommended. Download from [nodejs.org](https://nodejs.org/).
* **Web Browser:** A modern web browser (Chrome, Firefox, Edge, Safari).
* **Synack Access Token:** Your personal `accessToken` from an active Synack platform session.

## Installation

1.  **Get the Files:**
    * Clone the repository: `git clone <repository-url>`
    * OR Download the files (`proxy.js`, `index.html`, `marked.min.js`) manually.
2.  **Place Files:** Ensure `proxy.js`, `index.html`, and `marked.min.js` are all in the same project directory.
3.  **Install Dependencies:**
    * Open your terminal or command prompt.
    * Navigate (`cd`) into the project directory.
    * Run the following command to install the necessary Node.js packages for the proxy server:
        ```bash
        npm install express node-fetch@2
        ```
        *(This uses `node-fetch` version 2 for compatibility with the `require` syntax used in `proxy.js`)*

## Running the Application

You need to run **two** processes simultaneously in separate terminals from your project directory: the proxy server and a simple web server for the frontend.

1.  **Start the Proxy Server:**
    * In your terminal, run:
        ```bash
        node proxy.js
        ```
    * This server listens on `http://localhost:3000` by default and handles communication with the Synack API. Keep this terminal window open.

2.  **Serve the Frontend (HTML/JS/CSS):**
    * Open a **new** terminal window in the same project directory.
    * Use a simple HTTP server. Here are common options:
        * **Using Python 3:**
            ```bash
            python -m http.server 8000
            ```
            *(You can use any available port other than 3000, e.g., 8000, 8080)*
        * **Using Node.js (`http-server` package):**
            * Install globally (if you haven't): `npm install -g http-server`
            * Run the server: `http-server -p 8000`
            *(Again, choose an available port like 8000)*

3.  **Access the Dashboard:**
    * Open your web browser and navigate to the address provided by the *frontend* server (from Step 2), for example: `http://localhost:8000`

## Usage

1.  **Get Synack Token:**
    * Log in to the Synack platform in your browser.
    * Open the browser's Developer Tools (usually F12).
    * Go to the "Console" tab.
    * Paste and run this command: `sessionStorage.getItem('shared-session-com.synack.accessToken')`
    * Copy the long token string that is outputted (without the quotes).
2.  **Enter Token:** Paste the copied token into the "Enter Authorization Token" input field on the dashboard.
3.  **Fetch Summary:** Click the "Fetch Summary" button. The table should populate with your registered targets.
4.  **View Details:** Click the "Details" button in any row to load that target's details into the right-hand pane. Click the '✕' button on the pane to close it.
5.  **Register Targets:**
    * Click the "Register Available Targets" button.
    * The tool will fetch all unregistered targets via the proxy.
    * It will then filter these based on the `passed_assessments` array defined near the top of the `<script>` block in `index.html` (customize this array if needed!).
    * It will attempt to register for each filtered target one by one.
    * Progress will be displayed in the log area that appears below the controls.
    * Click the '✕' button on the log area to close it when finished.
6.  **Interact with Table:**
    * Use the "Show Columns" checkboxes to toggle column visibility.
    * Use the "Search targets..." input to filter the summary table by text.
    * Click on sortable column headers (like Name, Codename, Category, etc.) to sort the table.

## Files

* `index.html`: Contains the frontend HTML structure, CSS styling, and all client-side JavaScript logic.
* `proxy.js`: The Node.js Express server acting as a middleware/proxy to handle Synack API calls and manage CORS headers. Requires `express` and `node-fetch`.
* `marked.min.js`: The Marked.js library (v4+) used by `index.html` to render Markdown content from the API responses. Must be present locally.
* `package.json`, `package-lock.json` (Generated): Standard Node.js files managing project dependencies.
* `node_modules/` (Generated): Directory containing the downloaded Node.js dependencies (`express`, `node-fetch`). **Add this directory to your `.gitignore` file if using Git.**

## Notes & Disclaimer

* **Use Responsibly:** This tool interacts directly with the Synack API using your personal access token. Ensure your usage complies with Synack's Terms of Service and Rules of Engagement. Excessive requests could potentially lead to rate limiting or other issues.
* **Security:** Your access token is sent to the local proxy server but should not leave your machine. Be mindful of where you run this code.
* **Error Handling:** Error handling is basic. API errors from Synack or network issues might require checking the proxy server's console output for details.
* **Passed Assessments:** The filtering for auto-registration relies on the `passed_assessments` array in `index.html`. Make sure this accurately reflects the assessment types you are qualified for on the Synack platform.
