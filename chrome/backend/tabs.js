/*
 * Copyright (C) 2026 qubes-url-redirector fork contributors
 *
 * This file is part of qubes-url-redirector.
 *
 * qubes-url-redirector is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * qubes-url-redirector is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with qubes-url-redirector.  If not, see <http://www.gnu.org/licenses/>.
 */

/*
 * Same interface of common/js/backend/tabs.js, for a non persistent background:
 *   - blocked resources are kept in the session storage
 *   - a tab is one time whitelisted through a declarativeNetRequest session rule
 */
QUR.tabs = (function () {
    "use strict";

    const dnr = chrome.declarativeNetRequest;
    const session = chrome.storage.session;

    const key = (tabId) => "blocked_" + tabId;

    /* read-modify-write operations are serialized */
    let queue = Promise.resolve();
    function enqueue (fn) {
        const result = queue.then(fn);
        queue = result.catch((error) => console.error(error));
        return result;
    }

    const read = (tabId) => session.get(key(tabId)).then((r) => r[key(tabId)] || []);
    const write = (tabId, resources) => session.set({[key(tabId)]: resources});

    /* the session rule that whitelists a tab has the id of the tab */
    const isValidRuleId = (tabId) => Number.isInteger(tabId) && tabId >= 1;
    function rmWhitelistRule (tabId) {
        if (!isValidRuleId(tabId)) {
            return Promise.resolve();
        }
        return dnr.updateSessionRules({removeRuleIds: [tabId]})
            .catch((error) => console.error(error));
    }

    chrome.tabs.onRemoved.addListener(function (tabId) {
        enqueue(() => session.remove(key(tabId)));
        rmWhitelistRule(tabId);
    });

    /* the whitelisting ends when the target is loaded */
    chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
        const url = tab.url || "";
        if (changeInfo.status === "complete" && url !== "" && !url.startsWith("about:")) {
            rmWhitelistRule(tabId);
        }
    });

    return Object.freeze({
        create (createProperties) {
            const {oneTimeWhitelisted=false, targetUrl=""} = createProperties;

            if (typeof targetUrl !== "string" || typeof oneTimeWhitelisted !== "boolean") {
                return Promise.reject(null);
            }

            let href = "";
            if (targetUrl) {
                try {
                    href = new URL(targetUrl).href.split("#")[0];
                } catch (ignore) {
                    return Promise.reject(null);
                }
            }

            delete createProperties.oneTimeWhitelisted;
            delete createProperties.targetUrl;
            return chrome.tabs.create(createProperties).then(function (tab) {
                if (!targetUrl) {
                    return tab;
                }

                const whitelisted = (oneTimeWhitelisted && isValidRuleId(tab.id) && (/^[\x00-\x7F]*$/).test(href))
                    ? dnr.updateSessionRules({
                        removeRuleIds: [tab.id],
                        addRules: [{
                            id: tab.id,
                            priority: 3,
                            action: {type: "allow"},
                            condition: {
                                tabIds: [tab.id],
                                resourceTypes: ["main_frame"],
                                urlFilter: "|" + href,
                                isUrlFilterCaseSensitive: true
                            }
                        }]
                    })
                    : Promise.resolve();

                return whitelisted
                    .catch((error) => console.error(error))
                    .then(() => chrome.tabs.update(tab.id, {url: targetUrl}))
                    .then(() => tab);
            });
        },
        addBlockedRes (details) {
            const {tabId, url, type} = details;
            if (typeof url !== "string" || typeof type !== "string" || !Number.isInteger(tabId) || tabId < 0) {
                return Promise.resolve();
            }

            return enqueue(function () {
                return read(tabId).then(function (resources) {
                    const blocked = type === "main_frame" ? [] : resources;

                    const i = blocked.findIndex((d) => d.url === url);
                    if (i !== -1) {
                        blocked[i] = {url, type};
                    } else {
                        blocked.push({url, type});
                    }
                    return write(tabId, blocked);
                });
            });
        },
        rmBlockedRes (details) {
            const {tabId, url, type} = details;
            return enqueue(function () {
                return read(tabId).then(function (resources) {
                    return write(tabId, resources.filter((d) => !(d.url === url && d.type === type)));
                });
            });
        },
        clearBlockedRes: (tabId) => enqueue(() => session.remove(key(tabId))),
        getBlockedRes: (tabId) => enqueue(() => read(tabId))
    });
}());
