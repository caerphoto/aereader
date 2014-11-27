"use strict";

var express = require("express");
var $ = require("cheerio");
var request = require("request");
var path = require("path");

var app = express();

app.set("views", "./views");
app.set("view engine", "jade");

app.use(express.static(path.join(__dirname, "static")));

function parseReviewsIndex(html) {
    var $page = $.load(html);
    var links = $page(".post-body a");
    var URL_MATCH = /\.html$/;
    var result = [];

    links = links.filter(function (_, link) {
        return link.attribs && URL_MATCH.test(link.attribs.href);
    }).map(function (_, link) {
        var $link = $(link);
        var year = link.next ? link.next.data : null;

        if (year) {
            year = year.match(/\d+/);
            if (year) {
                year = year[0];
            } else {
                year = "Venice"; // I have no idea
            }
        } else {
            // The 'Fantômas' films
            year = "1913–1914";
        }

        return {
            url: link.attribs ? link.attribs.href : "no URL",
            title: $link.text(),
            year: year
        };
    }).each(function (_, link) {
        result.push(link);
    });

    return result;
}

/*
function readFile(filename, callback) {
    fs.readFile(filename, { encoding: "utf-8" }, function (err, data) {
        callback(err, null, data);
    });
}
*/

function fetchReviews(callback) {
    var REVIEWS_URL = "http://movieglut.blogspot.com/2010/01/reviews-by-title.html";

    request(REVIEWS_URL, function (err, res, html) {
        var reviewLinks;

        if (err) {
            console.err(err);
        }

        reviewLinks = parseReviewsIndex(html);
        if (typeof callback === "function") {
            callback(reviewLinks);
        }
    });
}

function categorizeReviewLinks(reviewLinks) {
    var sectionNames = "1ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    var sections = {};

    sectionNames.forEach(function (section) {
        sections[section] = {
            firstChar: section,
            links: []
        };
    });

    // Sort reviews into alphabetical sections.
    reviewLinks.forEach(function (link) {
        var firstChar = link.title.charAt(0).toUpperCase();

        // Handle '(500) Days of Summer' and '"On Your Mark"'
        if (firstChar === "(" || firstChar === "\"") {
            firstChar = link.title.charAt(1);
        }

        if (/\d/.test(firstChar)) {
            firstChar = "1";
        }

        // Some translated titles have a separate link element for the
        // translated part :-/
        if (!/^ \[/.test(link.title)) {
            try {
                sections[firstChar].links.push(link);
            } catch (e) {
                console.log(link);
            }
        }
    });

    return sections;
}

function parseReviewContent(html, url) {
    var $page = $.load(html);
    var title = "<h2>" + $page(".post-title").text() +
        "</h2><h3> <a href=\"" + url + "\">(original review page)</a></h3>";
    return title + $page(".post-body").html();
}

function fetchReviewContent(url, callback) {
    request(url, function (err, res, html) {
        var reviewContent;

        if (err) {
            console.log(err);
        }

        reviewContent = parseReviewContent(html, url);
        if (typeof callback === "function") {
            callback(reviewContent);
        }
    });
}

function resIndex(req, res) {
    fetchReviews(function (reviewLinks) {
        var sections = categorizeReviewLinks(reviewLinks);
        var section = req.params.section ? req.params.section : "1";

        if (!sections.hasOwnProperty(section)) {
            section = "1";
        }

        if (req.params.format === "json") {
            res.json(sections[section].links);
        } else {
            res.render("index", {
                pageTitle: "Antagony & Ecstasy Film Reviews",
                sections: sections,
                activeSection: section,
                sectionsJSON: JSON.stringify(sections)
            });
        }
    });
}

function resReview(req, res) {
    var url = decodeURIComponent(req.params.url);

    if (!url) {
        return res.send(404);
    }

    console.log("Fetching review for: " + url);
    fetchReviewContent(url, function (html) {
        res.send(html);
    });
}

app.get("/:section?.:format?", resIndex);
app.get("/reviews/:url", resReview);

app.listen(6165);
console.log("Listening on port 6165...");

