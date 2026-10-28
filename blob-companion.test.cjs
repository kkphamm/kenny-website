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
        pull() { sections.get("hero-section").querySelector().events.get("hero-card-pull")(); },
        reveal() { sections.get("hero-section").querySelector().events.get("hero-card-reveal")(); },
        runTimeout(delay) { const index = timeouts.findIndex((timer) => timer.delay === delay && timer.active); assert.notEqual(index, -1); const timer = timeouts.splice(index, 1)[0]; timer.active = false; timer.fn(); },
        step(ms = 50) { now += ms; frames.shift()(now); },
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
page.pull();
assert.equal(blob.hidden, false);
assert.equal(shadow.hidden, false);
assert.equal(blob.classes.has("is-pulling"), true);
assert.equal(shadow.classes.has("is-pulling"), true);
assert.equal(first.hidden, true);
assert.equal(bubble.hidden, true);
assert.equal(page.frames.length, 0);
assert.equal(page.intervals.length, 0);
page.reveal();
assert.equal(blob.classes.has("is-pulling"), false);
assert.equal(shadow.classes.has("is-pulling"), false);
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
assert.equal(first.styles.get("--lopacity"), "0"); // idle dots are hidden

page.window.scrollY = 6300;
const beforeMove = parseFloat(shadow.styles.get("--sy"));
page.step();
assert.ok(parseFloat(shadow.styles.get("--sy")) > beforeMove);
assert.equal(first.styles.get("--lopacity"), "0.85");
assert.ok(parseFloat(first.styles.get("--ly")) > parseFloat(blob.styles.get("--by")));
assert.ok(parseFloat(third.styles.get("--lopacity")) > 0);
assert.ok(Math.abs(parseFloat(second.styles.get("--ly")) - parseFloat(first.styles.get("--ly")) - 60 * 6615 / 9000) < 0.01);
assert.ok(Math.abs(parseFloat(third.styles.get("--ly")) - parseFloat(second.styles.get("--ly")) - 60 * 6615 / 9000) < 0.01);
assert.equal(bubble.hidden, true); // movement interrupts the intro
assert.equal(typed.textContent, "H");
assert.equal(page.intervals[0].active, true);
for (let i = 0; i < 20; i++) page.intervals[0].fn();
assert.equal(typed.textContent, "H"); // typing pauses while the bubble is hidden
assert.ok(parseFloat(blob.styles.get("--by")) < 1000); // catches up at a fixed speed
blob.events.get("pointerenter")();
assert.equal(shadow.classes.has("is-hovered"), true);
page.step();
assert.equal(first.styles.get("--lopacity"), "0");
assert.equal(bubble.hidden, true); // hovering during a journey does not restart speech
assert.equal(shadow.styles.get("--sscale"), "1");
assert.equal(shadow.styles.get("--sopacity"), "0.8");
assert.equal(parseFloat(shadow.styles.get("--sy")) - parseFloat(blob.styles.get("--by")), 24);
blob.events.get("pointerleave")();
assert.equal(shadow.classes.has("is-hovered"), false);
page.step();
assert.equal(first.styles.get("--lopacity"), "0.85");
for (let i = 0; i < 360; i++) page.step();
assert.equal(bubble.hidden, false);
assert.equal(typed.textContent, "H");
assert.equal(shadow.styles.get("--sscale"), "1");
assert.equal(shadow.styles.get("--sopacity"), "0.8");
assert.equal(parseFloat(shadow.styles.get("--sy")) - parseFloat(blob.styles.get("--by")), 24);
const introTyping = page.intervals.at(-1);
assert.equal(page.intervals.length, 1); // movement never starts a second introduction
introTyping.fn();
assert.equal(typed.textContent, "He"); // continues the same greeting instead of repeating it
let erased = false;
let secondLine = false;
let previousLength = typed.textContent.length;
for (let i = 0; i < 200 && introTyping.active; i++) {
    introTyping.fn();
    erased ||= typed.textContent.length < previousLength;
    secondLine ||= typed.textContent === "Your journey companion";
    previousLength = typed.textContent.length;
}
assert.equal(introTyping.active, false);
assert.equal(erased, true);
assert.equal(secondLine, true);
assert.equal(typed.textContent, "Scroll to adventure!");
assert.equal(bubble.classes.has("is-typing"), false);
assert.equal(bubble.hidden, false);
page.runTimeout(2500);
assert.equal(bubble.hidden, true);
for (let i = 0; i < 360; i++) page.step();
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
const outroTyping = page.intervals.at(-1);
assert.equal(outroTyping.delay, 44);
outroTyping.fn();
assert.equal(endTyped.textContent, "w");
for (let i = 1; i < 27; i++) outroTyping.fn();
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
for (let i = 0; i < 360; i++) page.step();
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
still.pull();
assert.equal(still.nodes[5].hidden, true);
assert.equal(still.nodes[4].hidden, true);
assert.equal(still.nodes[5].classes.has("is-pulling"), false);
still.reveal();
assert.equal(still.nodes[5].children[1].children[0].textContent, "Scroll to adventure!");
assert.equal(still.intervals.length, 0);
still.window.scrollY = 6300;
still.windowEvents.get("scroll")();
assert.equal(still.nodes[5].children[1].hidden, true);
assert.equal(still.timeouts.some((timer) => timer.delay === 2500 && timer.active), false);
assert.equal(still.nodes[5].children[2].hidden, true);
still.window.scrollY = 0;
still.windowEvents.get("scroll")();
assert.equal(still.timeouts.filter((timer) => timer.delay === 200 && timer.active).length, 1);
still.window.scrollY = 6300;
still.windowEvents.get("scroll")();
still.runTimeout(200); // scrolling settles before the same intro resumes
assert.equal(still.nodes[5].children[1].hidden, false);
assert.equal(still.nodes[5].children[2].hidden, true);
still.runTimeout(2500);
still.runTimeout(200);
assert.equal(still.nodes[5].children[2].hidden, false);
assert.equal(still.nodes[5].children[2].children[0].textContent, "we made it to the end, yay!");
still.window.scrollY = 0;
still.windowEvents.get("scroll")();
assert.equal(still.nodes[5].children[2].hidden, true);

const interrupted = run();
const [, , , , interruptedShadow, interruptedBlob] = interrupted.nodes;
const interruptedBubble = interruptedBlob.children[1];
interrupted.reveal();
for (let i = 0; i < 200 && interrupted.intervals[0].active; i++) interrupted.intervals[0].fn();
assert.equal(interruptedBubble.hidden, false);
interrupted.window.scrollY = 1400;
interrupted.step();
assert.equal(interruptedBubble.hidden, true);
assert.equal(interrupted.timeouts.some((timer) => timer.delay === 2500 && timer.active), false);
assert.ok(parseFloat(interruptedShadow.styles.get("--sscale")) < 1); // still hops while travelling
for (const scrollY of [1400, 1600, 1100, 2500]) {
    interrupted.window.scrollY = scrollY;
    for (let i = 0; i < 150; i++) interrupted.step();
    assert.equal(interruptedBubble.hidden, false);
    assert.equal(interruptedShadow.styles.get("--sscale"), "1");
    assert.equal(interruptedShadow.styles.get("--sopacity"), "0.8");
    assert.equal(parseFloat(interruptedShadow.styles.get("--sy")) - parseFloat(interruptedBlob.styles.get("--by")), 24);
    assert.equal(interruptedBubble.children[0].textContent, "Scroll to adventure!");
    assert.equal(interrupted.intervals.length, 1);
    assert.equal(interrupted.intervals.filter((timer) => timer.active).length, 0);
}
interrupted.runTimeout(2500);
interrupted.window.scrollY = 1500;
for (let i = 0; i < 150; i++) interrupted.step();
assert.equal(interruptedBubble.hidden, true); // a finished introduction does not repeat
assert.equal(interrupted.intervals.filter((timer) => timer.active).length, 0);

const earlyScroll = run();
earlyScroll.window.scrollY = 1400;
earlyScroll.pull();
assert.equal(earlyScroll.nodes[5].hidden, true);
earlyScroll.reveal();
assert.equal(earlyScroll.nodes[5].children[1].hidden, true);
assert.equal(earlyScroll.intervals.length, 0);
for (let i = 0; i < 150; i++) earlyScroll.step();
assert.equal(earlyScroll.nodes[5].children[1].hidden, false);

const pullingLayout = run();
const pullingTrack = pullingLayout.nodes[0];
const initialPullPath = pullingTrack.children[0].d;
pullingLayout.pull();
pullingLayout.window.innerWidth = 1600;
pullingLayout.windowEvents.get("resize")();
pullingLayout.resizeBody();
assert.equal(pullingTrack.viewBox, "0 0 1440 7200");
assert.equal(pullingTrack.children[0].d, initialPullPath);
pullingLayout.reveal();
assert.equal(pullingTrack.viewBox, "0 0 1600 7200");
assert.notEqual(pullingTrack.children[0].d, initialPullPath);
assert.equal(pullingLayout.frames.length, 1);

const narrow = run();
narrow.window.innerWidth = 1279;
narrow.pull();
assert.equal(narrow.nodes[5].hidden, true);
assert.equal(narrow.nodes[5].classes.has("is-pulling"), false);
narrow.reveal();
assert.equal(narrow.nodes[5].hidden, false);
assert.equal(narrow.frames.length, 1);

const approach = run();
const approachLights = approach.nodes.slice(1, 4);
const approachBlob = approach.nodes[5];
approach.reveal();
for (const scrollY of [1400, 700, 6300, 0]) {
    approach.window.scrollY = scrollY;
    const counts = [];
    let finalDots;
    for (let i = 0; i < 600; i++) {
        approach.step();
        const visible = approachLights.filter((dot) => parseFloat(dot.styles.get("--lopacity")) > 0);
        if (counts.at(-1) !== visible.length) counts.push(visible.length);
        if (visible.length === 2 && !finalDots) {
            finalDots = approachLights.map((dot) => ({ x: dot.styles.get("--lx"), y: dot.styles.get("--ly") }));
        }
        if (finalDots) {
            for (const dot of visible) {
                const point = finalDots[approachLights.indexOf(dot)];
                assert.equal(dot.styles.get("--lx"), point.x);
                assert.equal(dot.styles.get("--ly"), point.y); // remaining dots stay still as Blob reaches them
            }
        }
        if (visible.length === 0) break;
    }
    assert.deepEqual(counts, [3, 2, 1, 0]);
    assert.ok(finalDots);
    assert.equal(approachBlob.styles.get("--bx"), finalDots[2].x);
    assert.equal(approachBlob.styles.get("--by"), finalDots[2].y); // stops at the final dot in both directions
    for (let i = 0; i < 10; i++) approach.step();
    assert.ok(approachLights.every((dot) => dot.styles.get("--lopacity") === "0"));
}
approach.window.scrollY = 700;
for (let i = 0; i < 100; i++) approach.step();
approach.window.scrollY = 710;
approach.step(1000 / 120);
assert.equal(approachLights.filter((dot) => parseFloat(dot.styles.get("--lopacity")) > 0).length, 1);
assert.ok(parseFloat(approachLights[2].styles.get("--ly")) > parseFloat(approach.nodes[4].styles.get("--sy")) - 24);
for (let i = 0; i < 10; i++) approach.step();
assert.ok(approachLights.every((dot) => dot.styles.get("--lopacity") === "0"));

for (const frameMs of [1000 / 60, 1000 / 120]) {
    const landing = run();
    const [, landingLight, , , landingShadow, landingBlob] = landing.nodes;
    const landingBubble = landingBlob.children[1];
    landing.reveal();
    landing.window.scrollY = 1400;
    let arrived = false;
    for (let i = 0; i < 600; i++) {
        const previousY = landingShadow.styles.get("--sy");
        landing.step(frameMs);
        if (previousY === landingShadow.styles.get("--sy") && landingLight.styles.get("--lopacity") === "0") {
            arrived = true;
            break;
        }
    }
    assert.equal(arrived, true);
    const groundY = parseFloat(landingShadow.styles.get("--sy")) - 24;
    const heights = [];
    for (let i = 0; i < Math.ceil(600 / frameMs); i++) {
        const height = groundY - parseFloat(landingBlob.styles.get("--by"));
        heights.push(height);
        assert.equal(parseFloat(landingShadow.styles.get("--sy")), groundY + 24);
        assert.ok(Math.abs(parseFloat(landingShadow.styles.get("--sscale")) - (1 - height / 34 * 0.65)) < 1e-9);
        if (height > 0) assert.equal(landingBubble.hidden, true); // speech waits for the landing
        landing.step(frameMs);
    }
    assert.ok(Math.max(...heights) > 8 && Math.max(...heights) <= 12); // one small final bounce
    assert.ok(heights.every((height, i) => i === 0 || Math.abs(height - heights[i - 1]) < 2));
    assert.equal(heights.at(-1), 0);
    assert.equal(landingShadow.styles.get("--sscale"), "1");
    assert.equal(landingShadow.styles.get("--sopacity"), "0.8");
    assert.equal(landingBubble.hidden, false);
    landing.window.scrollY = 1420;
    for (let i = 0; i < 10; i++) landing.step(frameMs);
    assert.ok(parseFloat(landingShadow.styles.get("--sy")) - parseFloat(landingBlob.styles.get("--by")) > 24);
    landing.window.scrollY = 1600;
    landing.step(frameMs);
    assert.equal(landingBubble.hidden, true);
    assert.equal(landingLight.styles.get("--lopacity"), "0.85"); // movement interrupts the final bounce
    for (let i = 0; i < 150; i++) landing.step(frameMs);
    assert.equal(landingShadow.styles.get("--sscale"), "1");
    assert.equal(landingBubble.hidden, false);
    assert.equal(landing.intervals.length, 1);
}

function entrance({ reduced = false, width = 1440, scrollY = 0, companion = true, supported = true } = {}) {
    const events = [];
    const animations = [];
    let finish;
    let cancel;
    const card = {
        style: {},
        dispatchEvent(event) { events.push(event.type); },
        animate: supported ? (keyframes, options) => {
            animations.push({ keyframes, options });
            return { finished: { then(done, interrupted) { finish = done; cancel = interrupted; } } };
        } : undefined,
    };
    vm.runInNewContext(fs.readFileSync(`${__dirname}/script.js`, "utf8") + "\nApp.animateHeroCard();", {
        document: { getElementById: (id) => id === "hero-card" ? card : id === "blob-companion" && companion ? {} : null, querySelector: () => null, addEventListener() {} },
        window: { matchMedia: () => ({ matches: reduced }), innerWidth: width, scrollY },
        Event,
    });
    return { card, events, animations, finish: () => finish(), cancel: () => cancel() };
}

for (const complete of ["finish", "cancel"]) {
    const desktop = entrance();
    assert.deepEqual(desktop.events, ["hero-card-pull"]);
    assert.equal(desktop.animations.length, 1);
    desktop[complete]();
    assert.deepEqual(desktop.events, ["hero-card-pull", "hero-card-reveal"]);
    assert.equal(desktop.card.style.opacity, "1");
}
for (const options of [{ width: 1279 }, { scrollY: 100 }, { companion: false }]) {
    const plain = entrance(options);
    assert.deepEqual(plain.events, []);
    assert.equal(plain.animations.length, 1);
    plain.finish();
    assert.deepEqual(plain.events, ["hero-card-reveal"]);
}
for (const options of [{ reduced: true }, { supported: false }]) {
    const instant = entrance(options);
    assert.equal(instant.card.style.opacity, "1");
    assert.equal(instant.animations.length, 0);
    assert.deepEqual(instant.events, ["hero-card-reveal"]);
}
