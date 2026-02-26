/**
 * Content script for Swagger Preview for Notion
 *
 * Detects OpenAPI/Swagger specs in Notion code blocks and adds
 * a preview button that opens a Swagger UI panel.
 */

(function () {
  'use strict';

  const BUTTON_CLASS = 'swagger-preview-btn';
  const PANEL_ID = 'swagger-preview-panel';
  const PANEL_IFRAME_ID = 'swagger-preview-iframe';

  /** Patterns that indicate an OpenAPI/Swagger spec */
  const OPENAPI_INDICATORS = [
    /^\s*["']?openapi["']?\s*:/m,
    /^\s*["']?swagger["']?\s*:/m,
  ];

  const PATH_INDICATORS = [
    /["']?paths["']?\s*:/m,
    /["']?info["']?\s*:/m,
  ];

  /**
   * Check if text content looks like an OpenAPI/Swagger spec
   */
  function isOpenApiSpec(text) {
    if (!text || text.trim().length < 20) return false;

    // Try JSON first
    try {
      const obj = JSON.parse(text);
      if (obj && (obj.openapi || obj.swagger) && obj.info) return true;
    } catch (_) {
      // Not JSON, continue
    }

    // Check YAML patterns
    const hasVersionField = OPENAPI_INDICATORS.some((re) => re.test(text));
    const hasPathOrInfo = PATH_INDICATORS.some((re) => re.test(text));
    return hasVersionField && hasPathOrInfo;
  }

  /**
   * Get text content from a Notion code block element
   */
  function getCodeBlockText(codeBlock) {
    // Notion code blocks use .notion-code-block or have specific structure
    // The actual code is inside lines with specific class names
    const codeLines = codeBlock.querySelectorAll(
      '[class*="code_block"] .line, .notion-code-block .line, [contenteditable] .line'
    );

    if (codeLines.length > 0) {
      return Array.from(codeLines)
        .map((line) => line.textContent)
        .join('\n');
    }

    // Fallback: try to get text from code element or pre element
    const codeEl = codeBlock.querySelector('code, pre');
    if (codeEl) return codeEl.textContent;

    // Last fallback: get text from the code content area
    const contentArea = codeBlock.querySelector('[contenteditable="true"]');
    if (contentArea) return contentArea.textContent;

    return '';
  }

  /**
   * Create the preview button element
   */
  function createPreviewButton() {
    const btn = document.createElement('button');
    btn.className = BUTTON_CLASS;
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
      <span>Swagger Preview</span>
    `;
    btn.title = 'Preview as Swagger UI';
    return btn;
  }

  /**
   * Open the Swagger UI preview panel
   */
  function openPreviewPanel(specText) {
    // Remove existing panel if any
    closePreviewPanel();

    // Create panel container
    const panel = document.createElement('div');
    panel.id = PANEL_ID;

    // Create panel header
    const header = document.createElement('div');
    header.className = 'swagger-preview-panel-header';

    const title = document.createElement('span');
    title.className = 'swagger-preview-panel-title';
    title.textContent = 'Swagger Preview';

    const controls = document.createElement('div');
    controls.className = 'swagger-preview-panel-controls';

    const resizeBtn = document.createElement('button');
    resizeBtn.className = 'swagger-preview-panel-btn';
    resizeBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15 3 21 3 21 9"/>
        <polyline points="9 21 3 21 3 15"/>
        <line x1="21" y1="3" x2="14" y2="10"/>
        <line x1="3" y1="21" x2="10" y2="14"/>
      </svg>
    `;
    resizeBtn.title = 'Toggle fullscreen';
    resizeBtn.addEventListener('click', () => {
      panel.classList.toggle('swagger-preview-panel-fullscreen');
    });

    const closeBtn = document.createElement('button');
    closeBtn.className = 'swagger-preview-panel-btn swagger-preview-panel-close';
    closeBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    `;
    closeBtn.title = 'Close panel';
    closeBtn.addEventListener('click', closePreviewPanel);

    controls.appendChild(resizeBtn);
    controls.appendChild(closeBtn);
    header.appendChild(title);
    header.appendChild(controls);

    // Create resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'swagger-preview-resize-handle';
    setupResize(resizeHandle, panel);

    // Create iframe for Swagger UI
    const iframe = document.createElement('iframe');
    iframe.id = PANEL_IFRAME_ID;
    iframe.src = chrome.runtime.getURL('panel/panel.html');
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');

    panel.appendChild(resizeHandle);
    panel.appendChild(header);
    panel.appendChild(iframe);
    document.body.appendChild(panel);

    // Add body class for layout adjustment
    document.body.classList.add('swagger-preview-open');

    // Send spec to iframe once it loads
    iframe.addEventListener('load', () => {
      iframe.contentWindow.postMessage(
        { type: 'SWAGGER_PREVIEW_SPEC', spec: specText },
        '*'
      );
    });
  }

  /**
   * Close the preview panel
   */
  function closePreviewPanel() {
    const existing = document.getElementById(PANEL_ID);
    if (existing) {
      existing.remove();
      document.body.classList.remove('swagger-preview-open');
    }
  }

  /**
   * Set up drag-to-resize for the panel
   */
  function setupResize(handle, panel) {
    let startX, startWidth;

    function onMouseMove(e) {
      const diff = startX - e.clientX;
      const newWidth = Math.min(Math.max(startWidth + diff, 320), window.innerWidth - 200);
      panel.style.width = newWidth + 'px';
      e.preventDefault();
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    handle.addEventListener('mousedown', (e) => {
      startX = e.clientX;
      startWidth = panel.getBoundingClientRect().width;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });
  }

  /**
   * Process a single code block element
   */
  function processCodeBlock(codeBlock) {
    // Skip if already processed
    if (codeBlock.querySelector('.' + BUTTON_CLASS)) return;

    const text = getCodeBlockText(codeBlock);
    if (!isOpenApiSpec(text)) return;

    const btn = createPreviewButton();
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      // Re-read text at click time (content might have changed)
      const currentText = getCodeBlockText(codeBlock);
      openPreviewPanel(currentText);
    });

    // Position the button relative to the code block
    codeBlock.style.position = 'relative';
    codeBlock.appendChild(btn);
  }

  /**
   * Scan the page for Notion code blocks
   */
  function scanForCodeBlocks() {
    // Notion uses different class naming patterns for code blocks
    const selectors = [
      '.notion-code-block',
      '[class*="code_block"]',
      // Notion's React-based DOM sometimes uses data attributes
      '[data-block-id] .notion-code-block',
    ];

    const codeBlocks = document.querySelectorAll(selectors.join(', '));
    codeBlocks.forEach(processCodeBlock);

    // Also look for code blocks by structure:
    // Notion code blocks typically contain a <code> element inside a scrollable container
    document.querySelectorAll('.notion-page-content code').forEach((codeEl) => {
      // Walk up to find the block container
      let block = codeEl.closest('[data-block-id]');
      if (!block) block = codeEl.closest('[class*="code"]');
      if (block && !block.querySelector('.' + BUTTON_CLASS)) {
        processCodeBlock(block);
      }
    });
  }

  /**
   * Set up MutationObserver to watch for dynamically added code blocks
   */
  function setupObserver() {
    let debounceTimer;
    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(scanForCodeBlocks, 500);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // Listen for messages from background/popup
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'SCAN_CODE_BLOCKS') {
      scanForCodeBlocks();
      sendResponse({ status: 'scanned' });
    } else if (message.type === 'CLOSE_PANEL') {
      closePreviewPanel();
      sendResponse({ status: 'closed' });
    }
    return true;
  });

  // Initial scan and observer setup
  scanForCodeBlocks();
  setupObserver();
})();
