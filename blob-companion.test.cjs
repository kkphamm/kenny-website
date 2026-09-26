const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync(`${__dirname}/blob-companion.js`, "utf8");
const sectionTops = [0, 950, 2500, 3900, 5500];
const contentHeights = [500, 1050, 900, 1150, 800];

function run(reduced = false) {
    const nodes = [];
    const frames = [];
    const windowEvents = new Map();
    const timeouts = [];
    const intervals = [];
    let resizeBody;
    let footerExtra = 0;
    const window = {
        Blobatar: { blobatar: () => "<svg></svg>" },
        BlobatarExpression: { wink: {} },
        matchMedia: () => ({ matches: reduced }),
        innerWidth: 1440, innerHeight: 900, scrollY: 0,
        addEventListener: (type, handler) => windowEvents.set(type, handler),
        ResizeObserver: class { constructor(handler) { resizeBody = handler; } observe() {} },
    };
    function element() {
        const styles = new Map();
        const events = new Map();
        const classes = new Set();
        return {
            styles, events, classes,
            style: { setProperty: (key, value) => styles.set(key, value) },
            classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name), toggle: (name, on) => on ? classes.add(name) : classes.delete(name) },
            setAttribute(key, value) { this[key] = value; },
            addEventListener: (type, handler) => events.set(type, handler),
            append(...children) { this.children = children; },
            appendChild(child) { (this.children ||= []).push(child); },
            getTotalLength: () => 9000,
            getPointAtLength: (distance) => ({ x: 1380 - distance * 530 / 9000, y: 450 + distance * 6615 / 9000 }),
        };
    }
    const sections = new Map(sectionTops.map((top, i) => {
        const content = { events: new Map(), addEventListener(type, handler) { this.events.set(type, handler); }, getBoundingClientRect: () => ({
            top: top + 100 - window.scrollY,
            bottom: top + 100 + contentHeights[i] - window.scrollY,
            left: (window.innerWidth - (i === 0 ? 850 : 1100)) / 2,
            right: (window.innerWidth + (i === 0 ? 850 : 1100)) / 2,
        }) };
        return [["hero-section", "about", "experience", "projects", "contact"][i], {
            querySelector: () => content,
            getBoundingClientRect: () => ({ bottom: top + contentHeights[i] + 200 - window.scrollY }),
        }];
    }));
    const footerCopy = { getBoundingClientRect: () => ({ top: 7050 - window.scrollY, height: 30, right: window.innerWidth / 2 + 80 + footerExtra }) };
    const document = {
        documentElement: { scrollHeight: 7200 },
        getElementById: (id) => id === "hero-card" ? sections.get("hero-section").querySelector() : sections.get(id),
        querySelector: (selector) => selector === ".footer-copy" ? footerCopy : null,
        createElement: element,
        createElementNS: element,
        body: { append: (...items) => nodes.push(...items) },
    };
    vm.runInNewContext(source, {
        window, document, performance: { now: () => 0 }, requestAnimationFrame: (frame) => frames.push(frame),
        setTimeout: (fn, delay) => { const timer = { fn, delay, active: true }; timeouts.push(timer); return timer; },
        clearTimeout: (timer) => { timer.active = false; },
        setInterval: (fn, delay) => { const timer = { fn, delay, active: true }; intervals.push(timer); return timer; },
        clearInterval: (timer) => { timer.active = false; },
    });
    let now = 0;
    return {
        window, nodes, frames, windowEvents, timeouts, intervals, resizeBody,
        setFooterExtra(value) { footerExtra = value; resizeBody(); },
        reveal() { sections.get("hero-section").querySelector().events.get("hero-card-reveal")(); },
        runTimeout(delay) { const index = timeouts.findIndex((timer) => timer.delay === delay && timer.active); assert.notEqual(index, -1); const timer = timeouts.splice(index, 1)[0]; timer.active = false; timer.fn(); },
        step() { now += 50; frames.shift()(now); },
    };
}

const page = run();
const [track, first, second, third, shadow, blob] = page.nodes;
const [visual, bubble, endBubble] = blob.children;
const typed = bubble.children[0];
const endTyped = endBubble.children[0];
assert.equal(track.viewBox, "0 0 1440 7200");
assert.equal(track.style.height, "7200px");
assert.equal(visual["aria-hidden"], "true");
assert.equal(blob.hidden, true);
assert.equal(bubble.hidden, true);
assert.equal(endBubble.hidden, true);
assert.equal(page.frames.length, 0);
page.reveal();
assert.equal(blob.hidden, true);
page.runTimeout(1000);
assert.equal(blob.hidden, false);
assert.equal(bubble.hidden, false);
assert.equal(page.frames.length, 1);
assert.equal(page.intervals[0].delay, 44);
page.intervals[0].fn();
assert.equal(typed.textContent, "H");
const path = track.children[0].d;
assert.match(path, /^M690 60 L1195 60 Q1195 350 1195 640/); // starts above the card, 30px left of center
assert.equal((path.match(/ C/g) || []).length, 4);
assert.match(path, /Q[\d.]+ 7017 850 7017 L850 7065$/); // crosses above the copyright line
page.setFooterExtra(20);
assert.match(track.children[0].d, /Q[\d.]+ 7017 870 7017 L870 7065$/);
page.setFooterExtra(0);
assert.equal(track.children[0].d, path); // layout rebuild keeps the current route
for (const bottom of [640, 2140, 3540, 5190, 6440]) {
    const match = path.match(new RegExp(`Q([\\d.]+) [\\d.]+ ([\\d.]+) ${bottom}(?: |$)`));
    assert.ok(match);
    const [controlX, laneX] = match.slice(1).map(Number);
    if (bottom === 640) assert.ok(controlX >= 1195 && laneX >= 1195);
    else if (laneX < 720) assert.ok(controlX <= 120 && laneX <= 120);
    else assert.ok(controlX >= 1320 && laneX >= 1320);
}
assert.ok(parseFloat(first.styles.get("--ly")) > parseFloat(blob.styles.get("--by")));
assert.equal(first.styles.get("--lopacity"), "0"); // idle dots are hidden

page.window.scrollY = 6300;
const beforeMove = parseFloat(shadow.styles.get("--sy"));
page.step();
assert.ok(parseFloat(shadow.styles.get("--sy")) > beforeMove); // moves and hops during typing
assert.equal(first.styles.get("--lopacity"), "0.85");
assert.ok(parseFloat(third.styles.get("--lopacity")) > 0);
assert.ok(Math.abs(parseFloat(second.styles.get("--ly")) - parseFloat(first.styles.get("--ly")) - 60 * 6615 / 9000) < 0.01);
assert.ok(Math.abs(parseFloat(third.styles.get("--ly")) - parseFloat(second.styles.get("--ly")) - 60 * 6615 / 9000) < 0.01);
assert.equal(bubble.hidden, false);
assert.equal(typed.textContent, "H");
assert.ok(parseFloat(blob.styles.get("--by")) < 1000); // catches up at a fixed speed
blob.events.get("pointerenter")();
assert.equal(shadow.classes.has("is-hovered"), true);
page.step();
assert.equal(first.styles.get("--lopacity"), "0");
blob.events.get("pointerleave")();
assert.equal(shadow.classes.has("is-hovered"), false);
page.step();
assert.equal(first.styles.get("--lopacity"), "0.85");
let erased = false;
let secondLine = false;
let previousLength = typed.textContent.length;
for (let i = 0; i < 200 && page.intervals[0].active; i++) {
    page.intervals[0].fn();
    erased ||= typed.textContent.length < previousLength;
    secondLine ||= typed.textContent === "Your journey companion";
    previousLength = typed.textContent.length;
}
assert.equal(page.intervals[0].active, false);
assert.equal(erased, true);
assert.equal(secondLine, true);
assert.equal(typed.textContent, "Scroll to adventure!");
assert.equal(bubble.classes.has("is-typing"), false);
assert.equal(bubble.hidden, false);
page.runTimeout(2500);
assert.equal(bubble.hidden, true);
for (let i = 0; i < 350; i++) page.step();
assert.ok(Math.abs(parseFloat(blob.styles.get("--by")) - 7065) < 0.1); // footer text baseline
assert.ok(Math.abs(parseFloat(blob.styles.get("--bx")) - 850) < 1); // 50px right of footer copy
assert.equal(endBubble.hidden, true);
page.runTimeout(200);
assert.equal(visual.classes.has("is-celebrating"), true);
assert.equal(shadow.classes.has("is-celebrating"), true);
assert.equal(endBubble.hidden, true);
page.runTimeout(550);
assert.equal(visual.classes.has("is-celebrating"), false);
assert.equal(endBubble.hidden, false);
assert.equal(endBubble.classes.has("is-typing"), true);
assert.equal(page.intervals[1].delay, 44);
page.intervals[1].fn();
assert.equal(endTyped.textContent, "w");
for (let i = 1; i < 27; i++) page.intervals[1].fn();
assert.equal(endTyped.textContent, "we made it to the end, yay!");
assert.equal(endBubble.classes.has("is-typing"), false);
assert.equal(first.styles.get("--lopacity"), "0");
const endY = blob.styles.get("--by");
blob.events.get("pointerenter")();
for (let i = 0; i < 5; i++) page.step();
assert.equal(blob.styles.get("--by"), endY); // hover never moves its hit box
assert.equal(endBubble.hidden, false);
blob.events.get("pointerleave")();
page.window.scrollY = 0;
page.step();
const returnPath = track.children[0].d;
assert.notEqual(returnPath, path); // new route when leaving the footer
assert.equal(endBubble.hidden, true);
assert.ok(parseFloat(first.styles.get("--ly")) < parseFloat(blob.styles.get("--by")));
assert.equal(first.styles.get("--lopacity"), "0.85");
for (let i = 0; i < 350; i++) page.step();
page.window.scrollY = 6300;
page.step();
assert.notEqual(track.children[0].d, returnPath); // new route when leaving the top
page.window.innerWidth = 1600;
page.windowEvents.get("resize")();
assert.equal(track.viewBox, "0 0 1600 7200");
page.resizeBody();
assert.equal(track.style.height, "7200px");

const still = run(true);
assert.equal(still.frames.length, 0);
assert.equal(still.nodes[0].style.display, undefined);
assert.equal(still.nodes[4].style.display, undefined);
assert.ok(Math.abs(parseFloat(still.nodes[5].styles.get("--by")) - 450) < 0.1);
still.reveal();
still.runTimeout(1000);
assert.equal(still.nodes[5].children[1].children[0].textContent, "Scroll to adventure!");
assert.equal(still.intervals.length, 0);
still.runTimeout(2500);
assert.equal(still.nodes[5].children[1].hidden, true);
still.window.scrollY = 6300;
still.windowEvents.get("scroll")();
assert.equal(still.nodes[5].children[2].hidden, true);
still.window.scrollY = 0;
still.windowEvents.get("scroll")();
assert.equal(still.timeouts.some((timer) => timer.delay === 200 && timer.active), false);
still.window.scrollY = 6300;
still.windowEvents.get("scroll")();
still.runTimeout(200);
assert.equal(still.nodes[5].children[2].hidden, false);
assert.equal(still.nodes[5].children[2].children[0].textContent, "we made it to the end, yay!");
still.window.scrollY = 0;
still.windowEvents.get("scroll")();
assert.equal(still.nodes[5].children[2].hidden, true);

const card = { style: {}, dispatchEvent(event) { this.eventType = event.type; } };
vm.runInNewContext(fs.readFileSync(`${__dirname}/script.js`, "utf8") + "\nApp.animateHeroCard();", {
    document: { getElementById: (id) => id === "hero-card" ? card : null, querySelector: () => null, addEventListener() {} },
    window: { matchMedia: () => ({ matches: true }) },
    Event,
});
assert.equal(card.eventType, "hero-card-reveal");
