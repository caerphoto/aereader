//jshint browser: true
/*global SECTIONS */
"use strict";

function $(selector) {
    var result = [];
    var els = document.querySelectorAll(selector);
    Array.prototype.forEach.call(els, function (el) {
        result.push(el);
    });

    return result;
}

function appUrlForUrl(url) {
    var l = window.location;
    return l.protocol + "//" + l.host + "/reviews/" + encodeURIComponent(url);
}

function renderLinksForSection(section) {
    var elReviewLinks = $("#reviewLinks")[0];
    var elList = document.createElement("ul");

    elReviewLinks.innerHTML = "";
    SECTIONS[section].links.forEach(function (link) {
        var elLi = document.createElement("li");
        var elA = document.createElement("a");

        elA.href = link.url;
        elA.appendChild(document.createTextNode(link.title));
        elLi.appendChild(elA);
        elLi.appendChild(document.createTextNode(" (" + link.year + ")"));
        elList.appendChild(elLi);
    });

    elReviewLinks.appendChild(elList);
}

function setActiveLink(section, links) {
    var elPrevious = links.querySelector(".active");
    var link = links.querySelector("[href^=" + section + "]");

    elPrevious.className = "";
    link.parentNode.className = "active";

    window.location.hash = link.getAttribute("href");
}

function getTextNodes(root) {
    var nodes = [];
    var node;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);

    while (walker.nextNode()) {
        node = walker.currentNode;
        if (node.parentNode.nodeName !== "CODE" &&
                node.parentNode.nodeName !== "STYLE") {

            nodes.push(walker.currentNode);
        }
    }

    return nodes;
}

function transformText(root) {
    var replacements = [
        { r: /``/g, s: "“" },
        { r: /''/g, s: "”" },

        // Order of these is imporant – opening quotes need to be done first.
        { r: /(^|\s)`/g, s: "$1‘" },
        { r: /(^|\s)"/g, s: "$1“" }, // ldquo
        { r: /"/g,       s: "”" },   // rdquo

        { r: /(^|\s)'/g, s: "$1‘" }, // lsquo
        { r: /'/g,       s: "’" },   // rsquo

        { r: /---/g, s: "—" },  // em dash
        { r: /--/g,  s: "–" },  // en dash
        { r: / - /g, s: " – "}, // en dash

        { r: /\.\.\./g, s: "…" } // hellip
    ];
    var inlineElements = [
        "A",
        "SPAN",
        "EM",
        "I",
        "STRONG",
        "B"
    ];
    var textNodes = getTextNodes(root || window.document);

    textNodes.forEach(function (node) {
        var text = node.nodeValue;
        var prev = node.previousSibling;

        // Insert null character before node text if node immediately follows an
        // inline node, to handle cases like:
        // Link to <a href="blog.com">person</a>'s blog.
        // This prevents the apostrophe being incorrectly replaced with an
        // opening single quote.
        if (prev && inlineElements.indexOf(prev.nodeName) !== -1) {
            text = "\u0000" + text;
        }

        replacements.forEach(function (r) {
            text = text.replace(r.r, r.s);
        });

        node.nodeValue = text;
    });
}

function renderReview(html) {
    var elReview = $("#review")[0];

    elReview.innerHTML = html;

    transformText(elReview);
}

function fetchReviewText(url) {
    var xhr = new XMLHttpRequest();
    var elReview = $("#review")[0];
    var titlePos;
    var windowPos;

    elReview.className = "loading";

    titlePos = $("#review")[0].offsetTop;
    windowPos = window.pageYOffset || document.documentElement.scrollTop;
    if (windowPos > titlePos) {
        window.scrollTo(0, titlePos);
    }


    xhr.addEventListener("load", function () {
        elReview.className = "";

        if (xhr.status === 404) {
            return console.log("Not found");
        }

        renderReview(xhr.responseText);
    }, false);

    xhr.open("GET", appUrlForUrl(url));
    xhr.send();
}

(function setupHandlers() {
    var elNav = $("#sections")[0];
    var elReviewLinks = $("#reviewLinks")[0];
    var hash;

    elNav.addEventListener("click", function (evt) {
        var section;

        if (evt.target.nodeName !== "A") {
            return;
        }

        evt.preventDefault();
        section = evt.target.getAttribute("href");

        setActiveLink(section, elNav);
        renderLinksForSection(section);
    }, false);

    elReviewLinks.addEventListener("click", function (evt) {
        var url;

        if (evt.target.nodeName !== "A") {
            return;
        }

        evt.preventDefault();
        url = evt.target.getAttribute("href");
        fetchReviewText(url, renderReview);

    }, false);

    if (window.location.hash) {
        hash = window.location.hash.slice(1);
        if (hash && SECTIONS[hash]) {
            setActiveLink(hash, $("#sections")[0]);
            renderLinksForSection(hash);
        }
    }
}());
