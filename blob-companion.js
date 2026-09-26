const { blobatar } = window.Blobatar;
const { wink } = window.BlobatarExpression;

const SECTION_IDS = ["hero-section", "about", "experience", "projects", "contact"];
const STEP_LENGTH = 180;
const SPEED = STEP_LENGTH / 0.35; // pixels of path per second
const HOP_HEIGHT = 34;
const LIGHT_STEPS = 3;
const LINES = ["Hey, I'm Blob!", "Your journey companion", "Scroll to adventure!"];
const MESSAGE = "Hey, I'm Blob, your website journey companion. Scroll to adventure with me!";
const END_MESSAGE = "we made it to the end, yay!";

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const sections = SECTION_IDS.map((id) => document.getElementById(id));
const footerCopy = document.querySelector(".footer-copy");

const blob = document.createElement("div");
blob.id = "blob-companion";
const blobVisual = document.createElement("div");
blobVisual.className = "blob-visual";
blobVisual.setAttribute("aria-hidden", "true");
blobVisual.innerHTML = blobatar("mansuror", { traits: { shape: 0.35 }, expression: wink });
const message = document.createElement("div");
message.className = "blob-message";
message.setAttribute("role", "status");
message.setAttribute("aria-label", MESSAGE);
message.hidden = true;
const typed = document.createElement("span");
typed.setAttribute("aria-hidden", "true");
message.appendChild(typed);
const endMessage = document.createElement("div");
endMessage.className = "blob-message blob-end-message";
endMessage.setAttribute("role", "status");
endMessage.setAttribute("aria-label", END_MESSAGE);
endMessage.hidden = true;
const endTyped = document.createElement("span");
endTyped.setAttribute("aria-hidden", "true");
endMessage.appendChild(endTyped);
blob.append(blobVisual, message, endMessage);

const shadow = document.createElement("div");
shadow.id = "blob-shadow";

const svgNS = "http://www.w3.org/2000/svg";
const track = document.createElementNS(svgNS, "svg");
track.id = "blob-track";
track.setAttribute("aria-hidden", "true");
const guide = document.createElementNS(svgNS, "path");
track.append(guide);

const lights = Array.from({ length: LIGHT_STEPS }, () => {
    const dot = document.createElement("div");
    dot.className = "blob-light";
    return dot;
});

[blob, shadow, ...lights].forEach((element) => { element.hidden = true; });
document.body.append(track, ...lights, shadow, blob);

let routeLength = 0;
let startY = 0;
let endY = 0;
let routeChoices = [];

function chooseRoute() {
    const previous = routeChoices.slice(0, -1).map(({ cross }) => Number(cross)).join("");
    routeChoices = sections.map(() => ({ cross: Math.random() < 0.5, bulge: Math.random(), bend: Math.random() }));
    if (previous === routeChoices.slice(0, -1).map(({ cross }) => Number(cross)).join("")) {
        const i = Math.floor(Math.random() * (sections.length - 1));
        routeChoices[i].cross = !routeChoices[i].cross;
    }
}

function pointAt(distance) {
    return guide.getPointAtLength(Math.min(routeLength, Math.max(0, distance)));
}

function distanceAtY(y) {
    let low = 0;
    let high = routeLength;
    for (let i = 0; i < 16; i++) {
        const mid = (low + high) / 2;
        if (pointAt(mid).y < y) low = mid;
        else high = mid;
    }
    return (low + high) / 2;
}

function targetDistance() {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
    return distanceAtY(startY + (endY - startY) * progress);
}

function buildRoute() {
    const docHeight = document.documentElement.scrollHeight;
    const footerRect = footerCopy.getBoundingClientRect();
    const heroRect = document.getElementById("hero-card").getBoundingClientRect();
    const bounds = sections.map((section, i) => {
        const rect = section.getBoundingClientRect();
        const content = i ? section.querySelector(".section-inner, .contact-container").getBoundingClientRect() : heroRect;
        return {
            bottom: rect.bottom + window.scrollY,
            contentTop: content.top + window.scrollY,
            contentBottom: content.bottom + window.scrollY,
            left: Math.max(38, content.left - 50),
            right: Math.min(window.innerWidth - 38, content.right + 50),
        };
    });
    startY = bounds[0].contentTop - 40; // 30px blob radius plus a 10px gap above the card
    endY = footerRect.top + footerRect.height / 2 + window.scrollY;
    const endX = footerRect.right + 50;
    let side = 1;
    bounds[0].lane = bounds[0].right;
    let path = `M${(heroRect.left + heroRect.right) / 2 - 30} ${startY} L${bounds[0].lane} ${startY}`;

    for (let i = 0; i < bounds.length; i++) {
        const current = bounds[i];
        const enterY = current.enterY ?? startY;
        const leaveY = Math.max(current.contentBottom + 40, enterY + 40);
        const outward = i === 0 ? current.lane : side === 1
            ? Math.min(window.innerWidth - 38, current.lane + routeChoices[i].bulge * 70)
            : Math.max(38, current.lane - routeChoices[i].bulge * 70);
        path += ` Q${outward} ${(enterY + leaveY) / 2} ${current.lane} ${leaveY}`;
        if (i === bounds.length - 1) break;

        const next = bounds[i + 1];
        let fromY = leaveY;
        let toY = next.contentTop - 40;
        if (toY - fromY >= 64 && routeChoices[i].cross) side = -side;
        next.lane = side === 1 ? next.right : next.left;
        if (toY - fromY < 64) {
            next.lane = side === 1 ? Math.max(current.lane, next.lane) : Math.min(current.lane, next.lane);
            fromY = Math.max(fromY, current.bottom - 20);
            toY = Math.max(fromY + 40, current.bottom + 20);
        }
        const bendY = fromY + (toY - fromY) * (0.25 + routeChoices[i].bend * 0.5);
        path += ` L${current.lane} ${fromY} C${current.lane} ${bendY} ${next.lane} ${bendY} ${next.lane} ${toY}`;
        next.enterY = toY;
    }
    const last = bounds.at(-1);
    const approachY = endY - 48;
    path += ` Q${last.lane} ${approachY} ${endX} ${approachY} L${endX} ${endY}`;
    track.style.height = `${docHeight}px`;
    track.setAttribute("viewBox", `0 0 ${window.innerWidth} ${docHeight}`);
    guide.setAttribute("d", path);
    routeLength = guide.getTotalLength();
}

let distance = 0;
let dir = 1;
let hovering = false;
let shown = false;
let lastTime = performance.now();
let endState = 0;
let endTimer;
let endTyping;

function resetEnd() {
    if (!endState) return;
    clearTimeout(endTimer);
    if (endTyping) clearInterval(endTyping);
    endState = 0;
    endTyping = null;
    endMessage.hidden = true;
    endMessage.classList.remove("is-typing");
    endTyped.textContent = "";
    blobVisual.classList.remove("is-celebrating");
    shadow.classList.remove("is-celebrating");
}

function showEnd() {
    blobVisual.classList.remove("is-celebrating");
    shadow.classList.remove("is-celebrating");
    endMessage.hidden = false;
    endState = 3;
    if (reduced) { endTyped.textContent = END_MESSAGE; return; }
    endMessage.classList.add("is-typing");
    let count = 0;
    endTyping = setInterval(() => {
        endTyped.textContent = END_MESSAGE.slice(0, ++count);
        if (count === END_MESSAGE.length) {
            clearInterval(endTyping);
            endTyping = null;
            endMessage.classList.remove("is-typing");
        }
    }, 44);
}

function startEnd() {
    endState = 1;
    endTimer = setTimeout(() => {
        if (reduced) { showEnd(); return; }
        endState = 2;
        blobVisual.classList.add("is-celebrating");
        shadow.classList.add("is-celebrating");
        endTimer = setTimeout(showEnd, 550);
    }, 200);
}

function render(moving = false) {
    const { x, y } = pointAt(distance);
    const phase = (distance % STEP_LENGTH) / STEP_LENGTH;
    const hop = reduced ? 0 : Math.sin(phase * Math.PI) * Math.min(1, (routeLength - distance) / STEP_LENGTH);

    blob.style.setProperty("--bx", `${x}px`);
    blob.style.setProperty("--by", `${y - hop * HOP_HEIGHT}px`);
    shadow.style.setProperty("--sx", `${x}px`);
    shadow.style.setProperty("--sy", `${y + 24}px`);
    shadow.style.setProperty("--sscale", String(Math.max(0.2, 1 - hop * 0.65)));
    shadow.style.setProperty("--sopacity", String(0.8 - hop * 0.65));

    for (let k = 0; k < LIGHT_STEPS; k++) {
        const next = distance + dir * (k + 1) * STEP_LENGTH / LIGHT_STEPS;
        const dot = lights[k];
        if (next < 0 || next > routeLength) {
            dot.style.setProperty("--lopacity", "0");
            continue;
        }
        const p = pointAt(next);
        dot.style.setProperty("--lx", `${p.x}px`);
        dot.style.setProperty("--ly", `${p.y}px`);
        dot.style.setProperty("--lopacity", String(moving && !hovering ? 0.85 - k * 0.25 : 0));
    }
    const atEnd = shown && window.scrollY >= document.documentElement.scrollHeight - window.innerHeight && distance >= routeLength - 1 && message.hidden;
    if (moving || !atEnd) resetEnd();
    if (atEnd && !endState) startEnd();
}

function rebuild() {
    const progress = routeLength ? distance / routeLength : null;
    buildRoute();
    distance = progress === null ? targetDistance() : progress * routeLength;
    render();
}

function frame(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    if (!hovering) {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        // ponytail: Reroute at shared endpoints; mid-route switches would need a seamless splice.
        const atEnd = distance >= routeLength - 1 && dir > 0 && window.scrollY < maxScroll;
        const atStart = distance <= 1 && dir < 0 && window.scrollY > 0;
        if (atEnd || atStart) {
            chooseRoute();
            buildRoute();
            distance = atEnd ? routeLength : 0;
        }
    }
    const previous = distance;
    if (!hovering) {
        const delta = targetDistance() - distance;
        if (delta !== 0) dir = delta > 0 ? 1 : -1;
        distance += Math.max(-SPEED * dt, Math.min(SPEED * dt, delta));
    }
    render(distance !== previous);
    requestAnimationFrame(frame);
}

function showCompanion() {
    shown = true;
    [blob, shadow, ...lights].forEach((element) => { element.hidden = false; });
    message.hidden = false;
    if (reduced) {
        typed.textContent = LINES.at(-1);
        setTimeout(() => { message.hidden = true; render(); }, 2500);
        return;
    }
    lastTime = performance.now();
    requestAnimationFrame(frame);
    message.classList.add("is-typing");
    let line = 0;
    let count = 0;
    let deleting = false;
    let pause = 0;
    const typing = setInterval(() => {
        if (pause > 0) { pause--; return; }
        count += deleting ? -1 : 1;
        typed.textContent = LINES[line].slice(0, count);
        if (count === LINES[line].length) {
            if (line < LINES.length - 1) {
                deleting = true;
                pause = 12;
                return;
            }
            clearInterval(typing);
            message.classList.remove("is-typing");
            setTimeout(() => { message.hidden = true; }, 2500);
        } else if (count === 0) {
            deleting = false;
            line++;
            pause = 4;
        }
    }, 44);
}

if (!footerCopy || sections.some((section, i) => !section || !(i ? section.querySelector(".section-inner, .contact-container") : document.getElementById("hero-card")))) {
    [track, ...lights, shadow, blob].forEach((element) => { element.hidden = true; });
} else {
    chooseRoute();
    rebuild();
    document.getElementById("hero-card").addEventListener("hero-card-reveal", () => { rebuild(); setTimeout(showCompanion, 1000); }, { once: true });
    window.addEventListener("resize", rebuild);
    if (window.ResizeObserver) {
        const observer = new window.ResizeObserver(rebuild);
        observer.observe(document.body);
        observer.observe(footerCopy);
    }
    if (reduced) {
        lights.forEach((light) => { light.style.display = "none"; });
        window.addEventListener("scroll", () => { distance = targetDistance(); render(); });
    } else {
        blob.addEventListener("pointerenter", () => { hovering = true; blobVisual.classList.add("is-hovered"); shadow.classList.add("is-hovered"); });
        blob.addEventListener("pointerleave", () => { hovering = false; blobVisual.classList.remove("is-hovered"); shadow.classList.remove("is-hovered"); });
    }
}
