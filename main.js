// Dune API Configuration
const DUNE_API_KEY = "YGiuPrLDPiiFRrOc3lRhZI9PY34eRTGJ"; // Replace with your API key
const QUERY_ID = 6570862; // Replace with your query ID from Dune

// API endpoints
const DUNE_API_BASE = "https://api.dune.com/api/v1";

async function fetchBaseAnalytics() {
  try {
    // Show loading state
    updateLoadingState(true);

    // Execute query
    const executeResponse = await fetch(
      `${DUNE_API_BASE}/query/${QUERY_ID}/execute`,
      {
        method: "POST",
        headers: {
          "X-Dune-API-Key": DUNE_API_KEY,
          "Content-Type": "application/json",
        },
      },
    );

    const executeData = await executeResponse.json();
    const executionId = executeData.execution_id;

    // Poll for results
    const results = await pollForResults(executionId);

    // Update UI with results
    updateDashboard(results);
  } catch (error) {
    console.error("Error fetching data:", error);
    updateErrorState();
  }
}

// Poll for query results
async function pollForResults(executionId, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const statusResponse = await fetch(
      `${DUNE_API_BASE}/execution/${executionId}/results`,
      {
        headers: {
          "X-Dune-API-Key": DUNE_API_KEY,
        },
      },
    );

    const data = await statusResponse.json();

    if (data.state === "QUERY_STATE_COMPLETED") {
      return data.result.rows[0]; // Return first row with all metrics
    } else if (data.state === "QUERY_STATE_FAILED") {
      throw new Error("Query execution failed");
    }

    // Wait 2 seconds before next poll
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error("Query execution timeout");
}

// Alternative: Use cached results (faster, but may be outdated)
async function fetchCachedResults() {
  try {
    updateLoadingState(true);

    const response = await fetch(`${DUNE_API_BASE}/query/${QUERY_ID}/results`, {
      headers: {
        "X-Dune-API-Key": DUNE_API_KEY,
      },
    });

    const data = await response.json();

    console.log("Dune API Response:", data); // Debug log

    if (data.result && data.result.rows && data.result.rows.length > 0) {
      updateDashboard(data.result.rows[0]);
    } else {
      console.error("No results found in response:", data);
      throw new Error("No results found");
    }
  } catch (error) {
    console.error("Error fetching cached data:", error);
    updateErrorState();
  }
}

// Update dashboard with data
function updateDashboard(data) {
  // Helper function to safely update element
  const safeUpdate = (id, value) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = value;
    } else {
      console.warn(`Element with id '${id}' not found`);
    }
  };

  // Update total transaction count (all-time)
  safeUpdate("total-tx-count", formatNumber(data.total_tx_count));

  // Update 24h transaction count
  safeUpdate("tx-count", formatNumber(data.tx_count_24h));

  // Update active wallets
  safeUpdate("active-wallets", formatNumber(data.active_wallets));

  // Update gas price (in ETH)
  safeUpdate("gas-price", `${data.avg_gas_eth?.toFixed(6) || "0"} ETH`);

  // Update TPS
  safeUpdate("tps", data.tps || "--");

  // Update block height
  safeUpdate("block-height", formatNumber(data.block_height));

  // Update charts if data is available
  if (data.tx_chart_data) {
    updateTransactionChart(data.tx_chart_data);
  }

  if (data.wallet_chart_data) {
    updateWalletChart(data.wallet_chart_data);
  }

  // Hide loading state
  updateLoadingState(false);
}


// Format large numbers with commas
function formatNumber(num) {
  if (!num) return "--";
  return Math.floor(num).toLocaleString("en-US");
}

// Show/hide loading state
function updateLoadingState(isLoading) {
  const elements = [
    "total-tx-count",
    "tx-count",
    "active-wallets",
    "gas-price",
    "tps",
    "block-height",
  ];

  elements.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = isLoading ? "Loading..." : el.textContent;
    }
  });
}

// Show error state
function updateErrorState() {
  const elements = [
    "total-tx-count",
    "tx-count",
    "active-wallets",
    "gas-price",
    "tps",
    "block-height",
  ];

  elements.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = "Error";
    }
  });
}

// Auto-refresh every 5 minutes
function startAutoRefresh(intervalMinutes = 5) {
  fetchBaseAnalytics(); // Initial load
  setInterval(fetchBaseAnalytics, intervalMinutes * 60 * 1000);
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  // Use cached results for faster initial load
  fetchCachedResults();

  // Optional: Set up auto-refresh
  // startAutoRefresh(5);
});

// Export for manual refresh
window.refreshAnalytics = fetchBaseAnalytics;