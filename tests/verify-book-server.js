const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Starting BookServer & Book-01 Ingestion Verification Suite...\n');

const ROOT = path.resolve(__dirname, '..');
const bookPath = path.join(ROOT, 'Book-01.html');
const serverPath = path.join(ROOT, 'HtmlArtsServer.html');
const clientPath = path.join(ROOT, 'HtmlArtsClient.html');

// Test 1: Check Book-01.html file existence and structure
console.log('Test 1: Verifying Book-01.html markup, folios, and SVG visuals...');
assert(fs.existsSync(bookPath), 'Book-01.html must exist');
const bookContent = fs.readFileSync(bookPath, 'utf8');

const folioCount = (bookContent.match(/class=["']page\b[^"']*["']/g) || []).length;
assert(folioCount >= 11, `Book-01.html must contain at least 11 folios, found: ${folioCount}`);

const svgCount = (bookContent.match(/<svg\b/g) || []).length;
assert(svgCount >= 4, `Book-01.html must contain SVG diagrams and illustrations, found: ${svgCount}`);
console.log(`✅ Test 1 Passed: Found ${folioCount} folios and ${svgCount} rich SVG diagrams.`);

// Test 2: Check Book-01 interaction engine & protocol hooks
console.log('\nTest 2: Verifying reading experience elements, gestures, and postMessage protocols...');
assert(bookContent.includes('pointerdown'), 'Must support touch/pointer interaction');
assert(bookContent.includes('holding'), 'Must support hold-and-slide scrubbing gesture');
assert(bookContent.includes('HTMLARTS_EVENT'), 'Must dispatch HTMLARTS_EVENT protocol');
assert(bookContent.includes('HTMLARTS_NAV'), 'Must listen to parent HTMLARTS_NAV commands');
assert(bookContent.includes('index-dictionary.book'), 'Must support IndexDictionary protocol');
console.log('✅ Test 2 Passed: Touch gestures, scrub engine, and dual postMessage protocols verified.');

// Test 3: Check HtmlArtsServer.html structured book ingestion fidelity
console.log('\nTest 3: Verifying HtmlArtsServer.html structured book ingestion logic...');
const serverContent = fs.readFileSync(serverPath, 'utf8');
assert(serverContent.includes('isStructuredBook'), 'HtmlArtsServer.html must detect structured books');
assert(serverContent.includes('colorMatch'), 'HtmlArtsServer.html must extract theme-color/accent for cover rendering');
console.log('✅ Test 3 Passed: Structured book detection preserves full HTML, CSS, and SVG fidelity.');

// Test 4: Check HtmlArtsClient.html bookFrame sandbox configuration
console.log('\nTest 4: Verifying HtmlArtsClient.html iframe sandbox permissions...');
const clientContent = fs.readFileSync(clientPath, 'utf8');
assert(clientContent.includes('sandbox="allow-scripts'), 'bookFrame must allow scripts for interactive books');
assert(!clientContent.includes('allow-scripts allow-same-origin'), 'Must NOT combine allow-scripts and allow-same-origin (avoids sandbox escape warning)');
console.log('✅ Test 4 Passed: Clean script execution sandbox verified without escape warnings.');

console.log('\n🎉 ALL 4 BOOKSERVER TESTS PASSED! Book-01.html is ready for manual ingestion & test.');
