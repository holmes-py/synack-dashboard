// main.js

// --- Config, Helpers, Basic UI Functions ---
const columnsConfig = [
    { key: 'seq', header: '#', index: -1, visible: true, sortable: false },
    { key: 'actions', header: 'Actions', index: -2, visible: true, sortable: false },
    { key: 'name', header: 'Name', index: 1, visible: true, sortable: true },
    { key: 'codename', header: 'Codename', index: 2, visible: true, sortable: true },
    { key: 'categoryName', header: 'Category Name', index: 3, visible: true, sortable: true },
    { key: 'id', header: 'ID (Slug)', index: 4, visible: false, sortable: true },
    { key: 'orgId', header: 'Organization ID', index: 5, visible: false, sortable: true },
    { key: 'activatedAt', header: 'Activated At', index: 6, visible: true, sortable: true },
    { key: 'vulnDiscovery', header: 'Vuln Discovery', index: 7, visible: true, sortable: true },
    { key: 'collabCriteria', header: 'Collab Criteria', index: 8, visible: true, sortable: true },
];

function formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    try {
        // Multiply by 1000 if timestamp is in seconds
        const date = new Date(timestamp * 1000);
        return date.toLocaleString(); // Adjust format as needed
    } catch (e) {
        console.error("Error formatting timestamp:", timestamp, e);
        return 'Invalid Date';
    }
}

function buildTableHeaders() {
    const thead = document.querySelector("#targetTable thead tr");
    if (!thead) { console.error("Table header row not found!"); return; }
    thead.innerHTML = ''; // Clear existing headers
    columnsConfig.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col.header;
        th.dataset.columnIndex = col.index;
        th.dataset.key = col.key;
        if (col.sortable) {
            th.classList.add('sortable');
            th.onclick = () => sortTable(col.index); // Sort uses original index
        }
        if(col.key === 'actions') {
            th.classList.add('actions-header-cell'); // Example class
        }
        if (!col.visible) {
            th.classList.add('column-hidden');
        }
        thead.appendChild(th);
    });
}

function buildFilterControls() {
    const filterContainer = document.getElementById("columnFilterControls");
    if (!filterContainer) { console.error("Filter container not found!"); return; }
    // Clear existing controls except the "Show Columns:" text (if it exists within strong tag)
    filterContainer.querySelectorAll('label').forEach(el => el.remove());
    // Ensure Strong tag exists or create it
    const strongEl = filterContainer.querySelector('strong') || document.createElement('strong');
    strongEl.textContent = 'Show Columns: ';
    if (!filterContainer.querySelector('strong')) {
         filterContainer.prepend(strongEl); // Add if it wasn't there
    }

    columnsConfig.forEach(col => {
        // Skip seq and actions columns for filtering
        if (col.key === 'seq' || col.key === 'actions') return;

        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = col.visible;
        checkbox.dataset.key = col.key; // Link checkbox to column key
        checkbox.onchange = (event) => toggleColumnVisibility(col.key, event.target.checked);

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(` ${col.header}`));
        filterContainer.appendChild(label);
    });
}

function toggleColumnVisibility(columnKey, isVisible) {
     let visualIndex = -1;
     const headers = document.querySelectorAll("#targetTable thead th");
     headers.forEach((th, index) => {
         if (th.dataset.key === columnKey) {
             visualIndex = index;
         }
     });

     if (visualIndex === -1) return; // Column not found

     const cssIndex = visualIndex + 1; // CSS nth-child is 1-based

     // Toggle header visibility
     const header = document.querySelector(`#targetTable thead th:nth-child(${cssIndex})`);
     if (header) {
         header.classList.toggle('column-hidden', !isVisible);
     }

     // Toggle cell visibility in all body rows
     const cells = document.querySelectorAll(`#targetTable tbody tr td:nth-child(${cssIndex})`);
     cells.forEach(cell => {
         cell.classList.toggle('column-hidden', !isVisible);
     });

     // Update the config (optional, if needed for persistence)
     const colConfig = columnsConfig.find(c => c.key === columnKey);
     if (colConfig) colConfig.visible = isVisible;
}

async function fetchData() { // Fetches SUMMARY data
    const token = document.getElementById("token").value;
    const tbody = document.querySelector("#targetTable tbody");
    if (!tbody) { console.error("Table body not found!"); return; }
    tbody.innerHTML = "";
    let sequenceNumber = 1;
    const summaryApiUrl = "http://localhost:3000/proxy/summary"; // Absolute URL

    if (!token) { alert("Please enter a valid token."); return; }
    closeDetailsPane(); // Close details when fetching new summary
    closeRegistrationLog(); // Close log on new fetch

    try {
        const response = await fetch(summaryApiUrl, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
        });
         if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Error ${response.status}: ${response.statusText}. Response: ${errorText}`);
          }
         const data = await response.json();
         if (!Array.isArray(data)) {
              console.error("Received data is not an array:", data);
              alert("Received unexpected data format from the server.");
              return;
          }

        data.forEach(target => { // target here is from the SUMMARY list
            const row = document.createElement("tr");
            // Store targetId on the row itself for easier selection highlighting
            row.dataset.targetId = target.id;
            const targetIdForDetails = target.id; // Get the ID (slug) for the details button

            columnsConfig.forEach((col) => {
                const td = document.createElement('td');
                let cellValue = 'N/A'; // Default value

                switch (col.key) {
                    case 'seq': cellValue = sequenceNumber; break;
                    case 'actions': // Create Details button here
                        const button = document.createElement('button');
                        button.textContent = 'Details';
                        button.classList.add('details-btn');
                        button.dataset.targetId = targetIdForDetails; // Store ID on button
                        // Event listener will be handled by delegation
                        td.appendChild(button);
                        td.classList.add('actions-cell'); // Add class for potential styling
                        cellValue = null; // Prevent default 'N/A' text
                        break;
                    case 'name':            cellValue = target.name; break;
                    case 'codename':        cellValue = target.codename; break;
                    case 'categoryName':    cellValue = (target.category && target.category.name); break;
                    case 'id':              cellValue = target.id; break; // Display the ID (slug)
                    case 'orgId':           cellValue = target.organization_id; break;
                    case 'activatedAt':     cellValue = formatTimestamp(target.activated_at); break;
                    case 'vulnDiscovery':   cellValue = target.vulnerability_discovery === true ? 'Yes' : (target.vulnerability_discovery === false ? 'No' : 'N/A'); break; // Display boolean nicely
                    case 'collabCriteria':  cellValue = target.collaboration_criteria; break; // Handle null
                }

                if (cellValue !== null) { // Only set textContent if not handled by button etc.
                    td.textContent = cellValue || 'N/A'; // Handle null/undefined
                }
                 // Apply hidden class based on config
                 if (!col.visible) {
                     td.classList.add('column-hidden');
                 }
                row.appendChild(td);
            });
            tbody.appendChild(row);
            sequenceNumber++; // Increment sequence number for the next row
        });
    } catch (error) {
         console.error("Fetch Summary Error:", error);
         alert("Fetch Summary Error: " + error.message);
     }
}

// --- Target Details Functions ---
async function fetchTargetDetails(targetId, clickedButton) { // Pass button for row highlighting
     const token = document.getElementById("token").value;
     const detailsPane = document.getElementById("detailsPane");
     if (!detailsPane) { console.error("Details pane not found!"); return; }
     detailsPane.innerHTML = '<div class="status-message">Loading details...</div>';
     detailsPane.classList.add('visible'); // Make pane visible

     // Highlight selected row
     highlightSelectedRow(clickedButton);

     if (!token) {
         detailsPane.innerHTML = '<div class="status-message error">Error: Authorization token is missing.</div>'; return;
     }
     if (!targetId) {
          detailsPane.innerHTML = '<div class="status-message error">Error: Target ID is missing.</div>'; return;
      }

     const detailApiUrl = `http://localhost:3000/proxy/target/${targetId}`; // Absolute URL

     try {
         const response = await fetch(detailApiUrl, {
              method: "GET",
              headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
         });
         if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Error ${response.status}: ${response.statusText}. Response: ${errorText}`);
          }
         const details = await response.json();
         displayTargetDetails(details); // Display fetched details

     } catch (error) {
          console.error(`Workspace Details Error (ID: ${targetId}):`, error);
          detailsPane.innerHTML = `<div class="status-message error">Failed to load details for ${targetId}.<br>${error.message}</div>`;
          // Add close button even on error
          addCloseButton(detailsPane);
     }
 }

function displayTargetDetails(details) {
     const container = document.getElementById("detailsPane");
     if (!container) return; // Safety check
     container.innerHTML = ''; // Clear previous content or loading message
     addCloseButton(container); // Add close button first

     // Basic Info Section (Title and Paragraph)
     const title = document.createElement('h3');
     title.textContent = `${details.name || 'N/A'} (${details.codename || 'N/A'}) - Details`;
     container.appendChild(title);

     const basicInfo = document.createElement('p');
     basicInfo.innerHTML = `
         <strong>Slug:</strong> ${details.slug || 'N/A'}<br>
         <strong>Category:</strong> ${details.category || 'N/A'}<br>
         <strong>Organization:</strong> ${details.organization?.name || 'N/A'} (${details.organization?.slug || 'N/A'})<br>
         <strong>Active:</strong> ${details.active ? 'Yes' : 'No'} |
         <strong>Registered:</strong> ${details.registered ? 'Yes' : 'No'} |
         <strong>Testing Paused:</strong> ${details.testing_paused ? 'Yes' : 'No'}<br>
         <strong>Vuln Discovery:</strong> ${details.vulnerability_discovery ? 'Yes' : 'No'} |
         <strong>Collaboration:</strong> ${details.collaboration || 'N/A'}<br>
         <strong>Dates:</strong> ${formatTimestamp(details.start_date)} to ${formatTimestamp(details.end_date)} (Created: ${formatTimestamp(details.created_at)})
     `;
     container.appendChild(basicInfo);

     // Render Markdown Sections
     const renderMarkdownSection = (content, titleText) => {
         if (content) {
             const titleHeading = document.createElement('h4');
             titleHeading.textContent = titleText;
             container.appendChild(titleHeading);

             if (typeof marked !== 'undefined') {
                 // Directly insert the parsed HTML after the heading
                 container.insertAdjacentHTML('beforeend', marked.parse(content));
             } else {
                 const errorP = document.createElement('p');
                 errorP.textContent = "Markdown library not loaded. Cannot render content.";
                 errorP.style.color = 'red';
                 container.appendChild(errorP);
             }
         }
     };

     renderMarkdownSection(details.description, 'Description');
     renderMarkdownSection(details.details, 'Details (Scope)');
     renderMarkdownSection(details.rules, 'Rules');

     // Rules of Engagement (RoEs)
     if (details.roes && details.roes.length > 0) {
          const roeTitle = document.createElement('h4');
          roeTitle.textContent = 'Rules of Engagement (RoEs)';
          container.appendChild(roeTitle);
          const roeList = document.createElement('ul');
          roeList.classList.add('roe-list'); // Add class for styling
          details.roes.forEach(roe => {
              const item = document.createElement('li');
              const descSpan = document.createElement('span');
              descSpan.textContent = roe.description || 'N/A';
              const metaSpan = document.createElement('span');
              metaSpan.classList.add('roe-meta');
              metaSpan.textContent = `(ID: ${roe.id}, Created: ${formatTimestamp(roe.created_at)})`;
              item.appendChild(descSpan);
              item.appendChild(metaSpan);
              roeList.appendChild(item);
          });
          container.appendChild(roeList);
     }

      // Incentives (Optional display)
      if (details.incentives && details.incentives.length > 0) {
           const incTitle = document.createElement('h4');
           incTitle.textContent = 'Incentives';
           container.appendChild(incTitle);
           const incList = document.createElement('pre');
           incList.classList.add('incentives-pre'); // Add class for styling
           incList.textContent = JSON.stringify(details.incentives, null, 2);
           container.appendChild(incList);
      }
 }

// Function to add a close button to the details pane
function addCloseButton(container) {
     if (!container) return;
     // Remove existing button if any to prevent duplicates on error redraws
     const existingBtn = container.querySelector('#closeDetailsBtn');
     if (existingBtn) existingBtn.remove();

     const closeButton = document.createElement('button');
     closeButton.textContent = '✕';
     closeButton.id = 'closeDetailsBtn';
     closeButton.title = 'Close Details';
     closeButton.onclick = closeDetailsPane;
     container.appendChild(closeButton); // Append directly to pane (CSS handles positioning)
}

// Function to hide the details pane and deselect row
function closeDetailsPane() {
    const detailsPane = document.getElementById("detailsPane");
    if (!detailsPane) return;
    detailsPane.classList.remove('visible');
    // Restore initial message when closed
    detailsPane.innerHTML = '<div class="status-message">Select a target\'s details to view them here.</div>';
    // Remove row highlight
    const selectedRow = document.querySelector("#targetTable tbody tr.selected");
    if (selectedRow) {
        selectedRow.classList.remove("selected");
    }
}

// Function to highlight the selected table row
function highlightSelectedRow(clickedButton) {
    // Remove existing highlight
    const currentlySelected = document.querySelector("#targetTable tbody tr.selected");
    if (currentlySelected) {
        currentlySelected.classList.remove("selected");
    }
    // Add highlight to the parent row of the clicked button
    // Ensure clickedButton exists and has a closest 'tr'
    const row = clickedButton ? clickedButton.closest('tr') : null;
    if (row) {
        row.classList.add("selected");
    }
}

// --- Table Interaction Functions ---
function searchTable() {
    const input = document.getElementById("search").value.toLowerCase();
    const table = document.getElementById("targetTable");
    const tbody = table.tBodies[0];
    if (!tbody) return;
    const rows = tbody.rows; // Use live HTMLCollection

    for (let i = 0; i < rows.length; i++) {
        let row = rows[i];
        let rowText = "";
         // Select only visible cells for searching, skip seq and actions
         row.querySelectorAll("td").forEach((cell, index) => {
             const colConfig = columnsConfig[index]; // Get config based on cell index
             // Check if column exists in config and should be searched
             if (colConfig && colConfig.key !== 'seq' && colConfig.key !== 'actions' && !cell.classList.contains('column-hidden')) {
                 rowText += cell.textContent + " ";
             }
         });

         if (rowText.toLowerCase().includes(input)) {
             row.style.display = ""; // Show row
         } else {
             row.style.display = "none"; // Hide row
         }
     }
 }

 function sortTable(columnIndex) {
     // columnIndex refers to the original data index (e.g., 1 for Name, 2 for Codename)
      if (columnIndex < 1) return; // Ignore seq num and actions column if clicked accidentally

     const table = document.getElementById("targetTable");
     const tbody = table.tBodies[0];
     if (!tbody) return;

     // Find the current visual index for the given logical columnIndex
     let visualIndex = -1;
     document.querySelectorAll("#targetTable thead th").forEach((th, idx) => {
         // Compare using the original index stored in dataset
         if (parseInt(th.dataset.columnIndex) === columnIndex) {
             visualIndex = idx;
         }
     });
     if (visualIndex === -1) return; // Column not visible or found


     const rows = Array.from(tbody.rows);
     const currentSortDir = table.getAttribute(`data-sort-dir-col-${columnIndex}`) || "asc";
     const newSortDir = currentSortDir === "asc" ? "desc" : "asc";

     rows.sort((rowA, rowB) => {
          // Use visualIndex to get the correct cell in the current DOM structure
         const cellA = rowA.cells[visualIndex];
         const cellB = rowB.cells[visualIndex];
         const cellAContent = cellA ? cellA.textContent.trim().toLowerCase() : '';
         const cellBContent = cellB ? cellB.textContent.trim().toLowerCase() : '';

         let comparison = 0;
          // Special handling for dates (column index 6: Activated At)
          if (columnIndex === 6) {
             let dateA = new Date(cellAContent).getTime(); // Attempt to parse directly
             let dateB = new Date(cellBContent).getTime();
              comparison = (isNaN(dateA) || isNaN(dateB)) ? cellAContent.localeCompare(cellBContent) : dateA - dateB;
          } else {
            comparison = cellAContent.localeCompare(cellBContent);
          }

          return newSortDir === "asc" ? comparison : -comparison;
      });

      // Reset all column sort direction attributes (optional, for cleaner state)
      // columnsConfig.forEach(col => { if(col.sortable) table.removeAttribute(`data-sort-dir-col-${col.index}`); });
      // Update the sort direction attribute for the specific column using the original columnIndex
     table.setAttribute(`data-sort-dir-col-${columnIndex}`, newSortDir);

     // Add visual indicator (optional - e.g., add class to th)
     // document.querySelectorAll("#targetTable thead th.sortable").forEach(th => th.classList.remove('sorted-asc', 'sorted-desc'));
     // const headerCell = document.querySelector(`#targetTable thead th[data-column-index="${columnIndex}"]`);
     // if (headerCell) headerCell.classList.add(newSortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');


     tbody.innerHTML = ''; // Clear tbody
     rows.forEach(row => tbody.appendChild(row)); // Re-append sorted rows
 }


// --- Registration Functionality ---
const passed_assessments = ["Web Application", "Host", "Mobile", "Hardware", "Reverse Engineering", "Source Code"]; // Customize if needed
const registrationLog = document.getElementById('registrationLogContainer');

function logMessage(message, type = 'info') {
    if (!registrationLog) return;
    const p = document.createElement('p');
    p.textContent = message;
    p.className = `log-${type}`; // Apply CSS class based on type
    registrationLog.appendChild(p);
    // Scroll to bottom
    registrationLog.scrollTop = registrationLog.scrollHeight;
}

// Function to hide the registration log
function closeRegistrationLog() {
    if (registrationLog) {
        registrationLog.style.display = 'none';
        // Optional: Clear log content when closing
        // registrationLog.innerHTML = '';
    }
}

// Main function to handle registration process
async function registerAllTargets() {
    const token = document.getElementById("token").value;
    if (!token) {
        alert("Please enter a valid token before registering targets.");
        return;
    }
    if (!registrationLog) {
        console.error("Registration log container not found!");
        return;
    }

     // Disable button during process
     const registerBtn = document.getElementById('registerTargetsBtn');
     if (!registerBtn) return; // Safety check
     registerBtn.disabled = true;
     registerBtn.textContent = 'Registering...';

    // Clear, show log, and ADD close button
    registrationLog.innerHTML = ''; // Clear previous logs
    registrationLog.style.display = 'block';

    // --- Add Close Button for Log ---
    let closeBtn = registrationLog.querySelector('#closeLogBtn');
    if (!closeBtn) {
         closeBtn = document.createElement('button');
         closeBtn.textContent = '✕';
         closeBtn.id = 'closeLogBtn';
         closeBtn.title = 'Close Log';
         closeBtn.onclick = closeRegistrationLog; // Assign the close function
         // Prepend button inside the container for top-right positioning via CSS
         registrationLog.prepend(closeBtn);
    }
    // --- End Add Close Button ---

    logMessage('Starting registration process...', 'info');

    try {
        // 1. Fetch all unregistered targets
        logMessage('Fetching list of unregistered targets (this may take a moment)...', 'info');
        const unregisteredUrl = "http://localhost:3000/proxy/unregistered-targets";
        const response = await fetch(unregisteredUrl, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) {
            let errorMsg = `Failed to fetch unregistered targets: ${response.status} ${response.statusText}`;
            try { const errData = await response.json(); errorMsg += ` - ${errData.error || JSON.stringify(errData)}`; } catch (e) {}
            throw new Error(errorMsg);
        }

        const unregisteredTargets = await response.json();
        logMessage(`Found ${unregisteredTargets.length} unregistered targets.`, 'info');

        // 2. Filter targets based on passed assessments
        const targetsToRegister = unregisteredTargets.filter(target =>
            target.category && passed_assessments.includes(target.category)
        );

        if (targetsToRegister.length === 0) {
             logMessage('No targets found matching your qualified categories.', 'summary');
             // Keep log open, re-enable button handled in finally
             return; // Exit if no targets to register
         }

        logMessage(`Found ${targetsToRegister.length} targets to register based on your qualifications: [${passed_assessments.join(', ')}]`, 'info');

        // 3. Register each target sequentially
        let successCount = 0;
        let errorCount = 0;

        for (const target of targetsToRegister) {
            const targetId = target.slug; // Use slug from fetched data
            const targetName = target.name || targetId; // Use name if available
            logMessage(`Attempting to register: ${targetName} (${targetId})...`, 'info');

            const registerUrl = `http://localhost:3000/proxy/register-target/${targetId}`;
            try {
                const registerResponse = await fetch(registerUrl, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${token}` }
                    // Proxy adds Content-Type and body
                });

                if (registerResponse.ok || registerResponse.status === 200 || registerResponse.status === 204) {
                    logMessage(`Successfully registered: ${targetName} (${targetId})`, 'success');
                    successCount++;
                } else {
                     // Attempt to get error message from response body
                     let errMsg = `Status ${registerResponse.status} ${registerResponse.statusText}`;
                     try {
                         const errBody = await registerResponse.json();
                         errMsg += ` - ${errBody.message || errBody.error || JSON.stringify(errBody)}`;
                     } catch(e) { /* Ignore if body not JSON */ }
                     logMessage(`Error registering ${targetName} (${targetId}): ${errMsg}`, 'error');
                     errorCount++;
                 }
                 // Optional delay between requests
                 await new Promise(resolve => setTimeout(resolve, 150)); // e.g., 150ms delay
             } catch (regError) {
                 logMessage(`Network/Proxy Error registering ${targetName} (${targetId}): ${regError.message}`, 'error');
                 errorCount++;
             }
        }

        // 4. Log summary
        logMessage(`Registration process completed. Successful: ${successCount}, Errors: ${errorCount}`, 'summary');

    } catch (error) {
        console.error("Error during registration process:", error);
        logMessage(`An overall error occurred: ${error.message}`, 'error');
    } finally {
         // Re-enable button
         if (registerBtn) {
             registerBtn.disabled = false;
             registerBtn.textContent = 'Register Available Targets';
         }
         // Log remains open for review
     }
}


// --- Theme Toggle Logic ---
const themeToggleButton = document.getElementById('themeToggleBtn');

const applyTheme = (theme) => { // Function to apply theme
     document.body.classList.remove('dark-mode', 'light-mode'); // Remove existing theme classes
     if (theme === 'dark') {
         document.body.classList.add('dark-mode');
     } else {
          document.body.classList.add('light-mode'); // Optional: explicitly add light mode class
     }
 };

 // Check for saved theme or system preference
 const savedTheme = localStorage.getItem('theme');
 const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

 // Apply initial theme
 if (savedTheme) {
     applyTheme(savedTheme);
 } else if (prefersDark) {
     applyTheme('dark');
 } else {
     applyTheme('light'); // Default to light
 }

// Button click listener
if (themeToggleButton) {
    themeToggleButton.addEventListener('click', () => {
        let currentMode = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
        let newTheme = (currentMode === 'dark') ? 'light' : 'dark';
        applyTheme(newTheme); // Apply the new theme
        localStorage.setItem('theme', newTheme); // Save preference
    });
} else { console.error("Theme toggle button not found!"); }


// --- Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
     console.log("DOM Loaded. Setting up...");
     try {
         // Initial UI setup
         buildTableHeaders();
         buildFilterControls();

         // Event listener for search input
         const searchInput = document.getElementById("search");
         if(searchInput) searchInput.addEventListener('keyup', searchTable);

         // Event listener for details buttons (using delegation)
         const tableBody = document.querySelector("#targetTable tbody");
         if (tableBody) {
             tableBody.addEventListener('click', (event) => {
                 const button = event.target.closest('.details-btn');
                 if (button) {
                     const targetId = button.dataset.targetId;
                     if (targetId) { fetchTargetDetails(targetId, button); }
                 }
             });
         } else { console.error("Table body not found during initial setup!"); }

         console.log("Setup complete.");
     } catch (error) {
          console.error("Error during initial setup:", error);
          // Optionally display an error message to the user on the page
          // document.body.innerHTML = '<p style="color:red; padding:20px;">Fatal error during page setup. Check console.</p>';
     }
});
// --- End of main.js content ---