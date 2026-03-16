/**
 * downloadFile — Programmatic fetch-blob download helper.
 *
 * Instead of navigating the browser tab to the API endpoint (which fails on
 * production behind Nginx due to SPA fallback / streaming buffering), this
 * function fetches the file in the background with a proper Authorization
 * header, converts the response to a Blob, and triggers a native browser
 * "Save As" dialog via a hidden <a> click.
 *
 * @param {string} url       - Relative or absolute API URL to fetch.
 * @param {string} filename  - Suggested filename for the download dialog.
 * @param {string} token     - JWT token to send as Bearer auth header.
 */
export const downloadFile = async (url, filename, token) => {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    // Try to extract a JSON error message from the server response
    let serverMessage = `Server returned ${response.status}`;
    try {
      const json = await response.json();
      serverMessage = json.message || serverMessage;
    } catch (_) {
      // Response may not be JSON (e.g. plain text)
    }
    throw new Error(serverMessage);
  }

  const blob = await response.blob();

  // Create a temporary object URL pointing to the in-memory blob
  const objectUrl = URL.createObjectURL(blob);

  // Create a hidden anchor, programmatically click it, then clean up
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename || 'download';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();

  // Small delay before cleanup so the browser has time to start the download
  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
    document.body.removeChild(anchor);
  }, 500);
};
