/**
 * Panel script for Swagger Preview
 *
 * Receives OpenAPI spec from the content script and renders it
 * using Swagger UI.
 */

(function () {
  'use strict';

  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const swaggerUiEl = document.getElementById('swagger-ui');

  let currentUi = null;

  /**
   * Parse spec text as JSON or YAML
   */
  function parseSpec(text) {
    // Try JSON first
    try {
      return JSON.parse(text);
    } catch (_) {
      // Not JSON
    }

    // Try YAML
    if (typeof jsyaml !== 'undefined') {
      try {
        return jsyaml.load(text);
      } catch (e) {
        throw new Error('Failed to parse spec: ' + e.message);
      }
    }

    throw new Error('Could not parse the spec as JSON or YAML');
  }

  /**
   * Validate that the parsed object looks like an OpenAPI spec
   */
  function validateSpec(spec) {
    if (!spec || typeof spec !== 'object') {
      throw new Error('Spec must be a valid object');
    }
    if (!spec.openapi && !spec.swagger) {
      throw new Error('Missing "openapi" or "swagger" version field');
    }
    if (!spec.info) {
      throw new Error('Missing "info" section');
    }
    return spec;
  }

  /**
   * Show error message in the panel
   */
  function showError(message) {
    loadingEl.style.display = 'none';
    errorEl.style.display = 'block';
    swaggerUiEl.style.display = 'none';
    errorEl.innerHTML = `
      <div class="error-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e53e3e" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      </div>
      <h3>Parse Error</h3>
      <p>${escapeHtml(message)}</p>
      <p class="error-hint">Make sure the code block contains a valid OpenAPI/Swagger spec in YAML or JSON format.</p>
    `;
  }

  /**
   * Escape HTML special characters
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Render the spec using Swagger UI
   */
  function renderSwaggerUi(spec) {
    loadingEl.style.display = 'none';
    errorEl.style.display = 'none';
    swaggerUiEl.style.display = 'block';

    // Dispose previous instance
    if (currentUi) {
      swaggerUiEl.innerHTML = '';
    }

    try {
      currentUi = SwaggerUIBundle({
        spec: spec,
        dom_id: '#swagger-ui',
        deepLinking: false,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset,
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl,
        ],
        layout: 'BaseLayout',
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
        docExpansion: 'list',
        filter: false,
        showExtensions: true,
        showCommonExtensions: true,
        supportedSubmitMethods: ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'],
        requestInterceptor: function (req) {
          // Allow CORS requests from the panel
          return req;
        },
      });
    } catch (e) {
      showError('Swagger UI rendering failed: ' + e.message);
    }
  }

  /**
   * Handle incoming spec from content script
   */
  function handleSpec(specText) {
    try {
      const parsed = parseSpec(specText);
      const validated = validateSpec(parsed);
      renderSwaggerUi(validated);
    } catch (e) {
      showError(e.message);
    }
  }

  // Listen for spec messages from the content script
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SWAGGER_PREVIEW_SPEC') {
      handleSpec(event.data.spec);
    }
  });
})();
