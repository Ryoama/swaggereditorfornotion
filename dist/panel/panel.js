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
  const searchBarEl = document.getElementById('search-bar');
  const searchInputEl = document.getElementById('search-input');
  const searchClearEl = document.getElementById('search-clear');
  const searchCountEl = document.getElementById('search-count');

  let currentUi = null;
  let currentSpec = null;

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
   * Build a search index from the parsed spec for richer matching
   */
  function buildSearchIndex(spec) {
    const index = [];
    if (!spec || !spec.paths) return index;
    for (const [path, methods] of Object.entries(spec.paths)) {
      if (!methods || typeof methods !== 'object') continue;
      for (const [method, operation] of Object.entries(methods)) {
        if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace'].indexOf(method) === -1) continue;
        index.push({
          path: path,
          method: method.toUpperCase(),
          summary: (operation && operation.summary) || '',
          description: (operation && operation.description) || '',
          operationId: (operation && operation.operationId) || '',
          tags: (operation && operation.tags) || [],
        });
      }
    }
    return index;
  }

  /**
   * Filter Swagger UI operations based on search query
   */
  function filterOperations(query) {
    const q = query.toLowerCase().trim();
    const opblocks = swaggerUiEl.querySelectorAll('.opblock');
    const tagSections = swaggerUiEl.querySelectorAll('.opblock-tag-section');
    let matchCount = 0;
    let totalCount = 0;

    if (!q) {
      // Show all operations and tag sections
      opblocks.forEach((block) => {
        block.style.display = '';
        block.classList.remove('swagger-search-match');
      });
      tagSections.forEach((section) => { section.style.display = ''; });
      searchCountEl.textContent = '';
      searchClearEl.style.display = 'none';
      return;
    }

    searchClearEl.style.display = '';

    // Hide/show operations based on search query
    opblocks.forEach((block) => {
      totalCount++;
      const pathEl = block.querySelector('.opblock-summary-path, [class*="opblock-summary-path"]');
      const methodEl = block.querySelector('.opblock-summary-method');
      const descEl = block.querySelector('.opblock-summary-description');
      const pathText = pathEl ? pathEl.textContent.toLowerCase() : '';
      const methodText = methodEl ? methodEl.textContent.toLowerCase() : '';
      const descText = descEl ? descEl.textContent.toLowerCase() : '';
      const combinedText = pathText + ' ' + methodText + ' ' + descText;

      if (combinedText.indexOf(q) !== -1) {
        block.style.display = '';
        block.classList.add('swagger-search-match');
        matchCount++;
      } else {
        block.style.display = 'none';
        block.classList.remove('swagger-search-match');
      }
    });

    // Hide tag sections where all operations are hidden
    tagSections.forEach((section) => {
      const visibleOps = section.querySelectorAll('.opblock:not([style*="display: none"])');
      section.style.display = visibleOps.length === 0 ? 'none' : '';
    });

    searchCountEl.textContent = matchCount + ' / ' + totalCount;
  }

  /**
   * Set up search functionality
   */
  function setupSearch() {
    searchBarEl.style.display = '';
    let debounceTimer;
    searchInputEl.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        filterOperations(searchInputEl.value);
      }, 150);
    });

    searchClearEl.addEventListener('click', () => {
      searchInputEl.value = '';
      filterOperations('');
      searchInputEl.focus();
    });

    // Ctrl/Cmd+F to focus search
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputEl.focus();
        searchInputEl.select();
      }
      if (e.key === 'Escape' && document.activeElement === searchInputEl) {
        searchInputEl.value = '';
        filterOperations('');
        searchInputEl.blur();
      }
    });
  }

  /**
   * Add navigate-to-code buttons to each API operation path
   */
  function addPathButtons() {
    const summaries = document.querySelectorAll('.opblock-summary');
    summaries.forEach((summary) => {
      if (summary.querySelector('.swagger-path-nav-btn')) return;

      const pathEl = summary.querySelector('.opblock-summary-path, [class*="opblock-summary-path"]');
      if (!pathEl) return;

      // Extract the path from the deepest text-containing element
      const pathLink = pathEl.querySelector('a, span') || pathEl;
      const path = pathLink.textContent.trim().replace(/\u200B/g, '');

      if (!path || path === '/') return;

      // Navigate to code button
      const navBtn = document.createElement('button');
      navBtn.className = 'swagger-path-nav-btn';
      navBtn.title = 'Go to code: ' + path;
      navBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="16 18 22 12 16 6"/>
          <polyline points="8 6 2 12 8 18"/>
        </svg>
      `;
      navBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        window.parent.postMessage({ type: 'NAVIGATE_TO_CODE', path: path }, '*');
        navBtn.classList.add('swagger-path-nav-active');
        setTimeout(() => {
          navBtn.classList.remove('swagger-path-nav-active');
        }, 800);
      });

      // Insert after the path element
      pathEl.style.display = 'inline-flex';
      pathEl.style.alignItems = 'center';
      pathEl.appendChild(navBtn);
    });
  }

  /**
   * Watch for Swagger UI DOM changes and add path buttons
   */
  function setupPathButtons() {
    let debounceTimer;
    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(addPathButtons, 200);
    });

    observer.observe(swaggerUiEl, {
      childList: true,
      subtree: true,
    });

    // Also try after initial render delays
    setTimeout(addPathButtons, 500);
    setTimeout(addPathButtons, 1500);
    setTimeout(addPathButtons, 3000);
  }

  /**
   * Render the spec using Swagger UI
   */
  function renderSwaggerUi(spec) {
    loadingEl.style.display = 'none';
    errorEl.style.display = 'none';
    swaggerUiEl.style.display = 'block';
    currentSpec = spec;

    // Dispose previous instance
    if (currentUi) {
      swaggerUiEl.innerHTML = '';
    }

    // Reset search state
    searchInputEl.value = '';
    searchCountEl.textContent = '';
    searchClearEl.style.display = 'none';

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

      // Set up search and path action buttons after Swagger UI renders
      setupSearch();
      setupPathButtons();
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
