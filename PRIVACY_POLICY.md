# Privacy Policy — Swagger Preview for Notion

**Last updated:** February 26, 2026

## Overview

Swagger Preview for Notion is a browser extension that detects OpenAPI/Swagger specifications in Notion code blocks and renders them as interactive API documentation using Swagger UI. This extension is designed with privacy in mind and does not collect, store, or transmit any user data.

## Data Collection

This extension does **not** collect any of the following:

- Personally identifiable information
- Health information
- Financial or payment information
- Authentication information
- Personal communications
- Location data
- Web browsing history
- User activity data (clicks, keystrokes, etc.)

## How the Extension Works

1. The content script runs only on `notion.so` pages.
2. It reads the text content of Notion code blocks **locally in your browser** to determine whether they contain an OpenAPI/Swagger specification.
3. If a spec is detected, a preview button is added to the code block.
4. When clicked, the spec is rendered using Swagger UI in a local panel — all processing happens entirely within your browser.

## Data Transmission

No data is sent to any external server, third-party service, or analytics platform. All processing occurs locally within the browser.

## Permissions

- **activeTab** — Used only to check whether the current tab is a Notion page, so the popup can display the correct status.
- **Content scripts (notion.so)** — Required to detect OpenAPI specs in Notion code blocks and inject the preview button.

## Third-Party Libraries

This extension bundles the following open-source libraries locally (no remote loading):

- [Swagger UI](https://github.com/swagger-api/swagger-ui) — for rendering API documentation
- [js-yaml](https://github.com/nodeca/js-yaml) — for parsing YAML specifications

These libraries run entirely within the browser and do not communicate with external servers.

## Changes to This Policy

If this privacy policy is updated, the changes will be posted to this page with an updated date.

## Contact

If you have questions about this privacy policy, please open an issue on the GitHub repository:
https://github.com/Ryoama/swaggereditorfornotion/issues
