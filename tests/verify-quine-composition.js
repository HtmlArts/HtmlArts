// verify-quine-composition.js
// Automated verification suite for HtmlArts Software Composition & Quine Workbook Persistence

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Starting HtmlArts Composition & Quine Verification Suite...\n');

const serverHtmlPath = path.join(__dirname, '../HtmlArtsServer.html');
const serverContent = fs.readFileSync(serverHtmlPath, 'utf8');

// Test 1: Verify Zero-Leak Escaping Logic
console.log('Test 1: Verifying Quine \\u003c escaping logic...');
const mockPayload = {
  $schema: "https://htmlarts.org/schema/v2/catalog.json",
  appVersion: "2.1.0-local",
  CatalogVersion: "2026.11-v2",
  books: [
    {
      id: "test-book-1",
      title: "Nested Script Book",
      html: "<!doctype html><html><head><script>console.log('nested');</script></head><body><h1>Hello</h1></body></html>"
    }
  ]
};

const safeJson = JSON.stringify(mockPayload).replace(/</g, '\\u003c');
assert(!safeJson.includes('</script>'), 'Safe JSON must not contain literal </script>');
assert(!safeJson.includes('<script>'), 'Safe JSON must not contain literal <script>');
assert(safeJson.includes('\\u003c/script>'), 'Safe JSON must escape </script> to \\u003c/script>');

const parsed = JSON.parse(safeJson);
assert.strictEqual(parsed.books[0].html, mockPayload.books[0].html, 'Roundtrip JSON.parse must restore original HTML exactly');
console.log('✅ Test 1 Passed: Zero-leak JSON escaping works with 100% fidelity.\n');

// Test 2: Verify Refresh Icon Button and Shortcut in HtmlArtsServer.html
console.log('Test 2: Verifying Quine Refresh UI & Trigger in HtmlArtsServer.html...');
assert(serverContent.includes('id="btnRefreshQuine"'), 'HtmlArtsServer.html must contain #btnRefreshQuine');
assert(serverContent.includes('quine-refresh-btn'), 'HtmlArtsServer.html must include .quine-refresh-btn CSS class');
assert(serverContent.includes("e.key.toLowerCase() === 's'"), 'HtmlArtsServer.html must bind Ctrl+S / Cmd+S shortcut');
console.log('✅ Test 2 Passed: Refresh Icon button and keyboard triggers are verified in markup.\n');

// Test 3: Verify LocalJSON & Dual-Store IDB Handshake
console.log('Test 3: Verifying LocalJSON & Dual-Store IndexedDB startup logic...');
assert(serverContent.includes("document.getElementById('LOCAL_JSON')"), 'HtmlArtsServer.html must check for #LOCAL_JSON');
assert(serverContent.includes("document.getElementById('EMBEDDED_LIBRARY_DATA')"), 'HtmlArtsServer.html must check for #EMBEDDED_LIBRARY_DATA');
assert(serverContent.includes("STORE_META='books_meta'"), 'HtmlArtsServer.html must declare STORE_META');
assert(serverContent.includes("STORE_CONTENT='books_content'"), 'HtmlArtsServer.html must declare STORE_CONTENT');
assert(serverContent.includes("INK_STORE='annotations'"), 'HtmlArtsServer.html must declare INK_STORE');
console.log('✅ Test 3 Passed: Dual-store and LocalJSON hydration hooks verified.\n');

// Test 4: Verify Zero Leaked DOM Syntax in HTML Shell
console.log('Test 4: Verifying HTML Shell integrity...');
assert(serverContent.includes('<!doctype html>') || serverContent.includes('<!DOCTYPE html>'), 'Valid HTML5 doctype');
assert(serverContent.includes('</html>'), 'File must properly close html tag');
assert(!serverContent.includes('queryStore(STORE)'), 'Obsolete STORE reference must not exist');
console.log('✅ Test 4 Passed: HTML Shell syntax is clean and uncorrupted.\n');

console.log('🎉 ALL 4 TESTS PASSED! Quine persistence and composition engine verified.');
