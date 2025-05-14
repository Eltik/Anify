export default {
    async fetch(request) {
        // Clone the request to be able to modify it (if needed later)
        const url = new URL(request.url);
        console.log(`[LOG] Received request for: ${request.url}`);

        // Basic security: Ensure we are proxying requests for a specific domain or path if necessary.
        // For now, we'll proxy the exact URL passed in the request but remove the worker's path.
        // Example: if worker is at proxy.example.com and request is proxy.example.com/http://target.com
        // we want to fetch http://target.com

        // A simple way to get the target URL is to expect it as a query parameter
        // e.g. https://your-worker.your-account.workers.dev/?target=https://example.com/image.png
        const targetUrl = url.searchParams.get("target");
        console.log(`[LOG] Target URL specified: ${targetUrl}`);

        if (!targetUrl) {
            console.error("[ERROR] Missing target URL in request.");
            return new Response('Missing target URL. Please provide a target URL via the "target" query parameter.', {
                status: 400,
                headers: { "Content-Type": "text/plain" },
            });
        }

        try {
            new URL(targetUrl); // Validate if the targetUrl is a valid URL
        } catch {
            console.error(`[ERROR] Invalid target URL provided: ${targetUrl}`);
            return new Response("Invalid target URL provided.", {
                status: 400,
                headers: { "Content-Type": "text/plain" },
            });
        }

        // Create a new Request object for the target URL, copying method, headers, and body
        // We don't want to send Cloudflare-specific headers to the target
        const newHeaders = new Headers(request.headers);
        // Essential headers like Content-Type (which dictates body format), Accept, Authorization, etc.,
        // are copied from the original request unless explicitly modified or deleted below.

        // Remove Cloudflare-specific and common proxy headers to avoid leaking information
        // or causing issues with the target server.
        newHeaders.delete("cf-connecting-ip");
        newHeaders.delete("cf-ipcountry");
        newHeaders.delete("cf-ray");
        newHeaders.delete("cf-visitor");
        newHeaders.delete("cf-worker");
        newHeaders.delete("x-forwarded-proto");
        newHeaders.delete("x-real-ip");

        // Log the headers being sent to the target (be mindful of sensitive data in production)
        // Convert Headers object to a plain object for logging if needed, or iterate
        let headersForLog = {};
        for (let [key, value] of newHeaders.entries()) {
            headersForLog[key] = value;
        }
        console.log("[LOG] Headers being sent to target:", JSON.stringify(headersForLog));

        // You might want to add your own headers or modify existing ones
        // newHeaders.set('X-My-Proxy', 'Anify-Cloudflare-Worker');

        const proxyRequest = new Request(targetUrl, {
            method: request.method, // Preserves the method (GET, POST, PUT, DELETE, etc.) from the original request.
            headers: newHeaders, // Uses the processed headers, including Content-Type and other important client headers.
            body: request.body, // Forwards the original request body, supporting various formats (JSON, form data, binary, etc.).
            redirect: "manual", // Handle redirects manually if needed, or 'follow'
        });

        try {
            console.log(`[LOG] Attempting to fetch target: ${targetUrl}`);
            const response = await fetch(proxyRequest);
            console.log(`[LOG] Successfully fetched target: ${targetUrl}, status: ${response.status}`);
            // You might want to modify the response headers here as well
            // const newResponseHeaders = new Headers(response.headers);
            // newResponseHeaders.set('Access-Control-Allow-Origin', '*'); // Example: Add CORS header

            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers, // or newResponseHeaders if modified
            });
        } catch (error) {
            console.error(`[ERROR] Error fetching target URL '${targetUrl}':`, error.message, error.stack);
            return new Response(`Error fetching the target URL: ${error.message}`, {
                status: 500,
                headers: { "Content-Type": "text/plain" },
            });
        }
    },
};
