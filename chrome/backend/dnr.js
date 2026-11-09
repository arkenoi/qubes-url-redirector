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
 * Manifest V3 replacement of common/js/backend/req_handler.js.
 *
 * Blocking webRequest isn't available, so settings and URL list are compiled
 * into declarativeNetRequest dynamic rules:
 *   - top level navigations that aren't opened here are redirected to the
 *     firewall page, with the original URL as fragment. The page then asks
 *     the background (FIREWALL_HIT) to handle the URL.
 *   - the other requests that aren't opened here are blocked.
 * The redirection happens before any connection is opened.
 */
(function () {
    "use strict";

    const console_prefix = "[dnr] ";

    const dnr = chrome.declarativeNetRequest;

    const FIREWALL_PAGE = chrome.runtime.getURL("/common/html/firewall.html");
    const EXTENSION_ROOT = chrome.runtime.getURL("/");

    const ALL_TYPES = Object.values(dnr.ResourceType);
    const SUB_TYPES = ALL_TYPES.filter((t) => t !== "main_frame");

    const HANDLED_SCHEMES = "^(?:https?|wss?)://";

    const RULE_ID = Object.freeze({
        SELF: 1,
        DEFAULT_TOP: 2,
        DEFAULT_SUB: 3,
        FIRST_ENTRY: 10
    });
    const PRIORITY = Object.freeze({
        DEFAULT: 1,
        ENTRY: 2,
        /* 3 is used by the one time whitelisting of a tab */
        SELF: 4
    });

    /* a redirect rule needs to match, and capture, the whole URL */
    const wholeUrl = (regexSource) => "^.*?(?:" + regexSource + ").*";
    const REDIRECT_ACTION = Object.freeze({
        type: "redirect",
        redirect: {regexSubstitution: FIREWALL_PAGE + "#\\0"}
    });

    function isSupported (regexSource) {
        if (!(/^[\x00-\x7F]*$/).test(regexSource)) {
            return Promise.resolve(false);
        }

        const options = {regex: wholeUrl(regexSource), isCaseSensitive: true, requireCapturing: true};
        return dnr.isRegexSupported(options).then((result) => result.isSupported === true);
    }

    function actionFor (url) {
        return QUR.whitelist.isWhitelisted(url) ? QUR.settings.getListAction() : QUR.settings.getDefaultAction();
    }

    function makeRules (regexSources) {
        const OPEN_HERE = QUR.settings.ACTION.OPEN_HERE;
        const defaultOpenHere = QUR.settings.getDefaultAction() === OPEN_HERE;
        const listOpenHere = QUR.settings.getListAction() === OPEN_HERE;

        const rules = [];

        if (!defaultOpenHere) {
            rules.push({
                id: RULE_ID.DEFAULT_TOP,
                priority: PRIORITY.DEFAULT,
                action: REDIRECT_ACTION,
                condition: {regexFilter: HANDLED_SCHEMES + ".*", isUrlFilterCaseSensitive: true, resourceTypes: ["main_frame"]}
            });
            rules.push({
                id: RULE_ID.DEFAULT_SUB,
                priority: PRIORITY.DEFAULT,
                action: {type: "block"},
                condition: {regexFilter: HANDLED_SCHEMES, isUrlFilterCaseSensitive: true, resourceTypes: SUB_TYPES}
            });
        }

        regexSources.forEach(function (regexSource, i) {
            const id = RULE_ID.FIRST_ENTRY + 2 * i;

            if (listOpenHere && !defaultOpenHere) {
                rules.push({
                    id,
                    priority: PRIORITY.ENTRY,
                    action: {type: "allow"},
                    condition: {regexFilter: regexSource, isUrlFilterCaseSensitive: true, resourceTypes: ALL_TYPES}
                });
            } else if (!listOpenHere && defaultOpenHere) {
                rules.push({
                    id,
                    priority: PRIORITY.ENTRY,
                    action: REDIRECT_ACTION,
                    condition: {regexFilter: wholeUrl(regexSource), isUrlFilterCaseSensitive: true, resourceTypes: ["main_frame"]}
                });
                rules.push({
                    id: id + 1,
                    priority: PRIORITY.ENTRY,
                    action: {type: "block"},
                    condition: {regexFilter: regexSource, isUrlFilterCaseSensitive: true, resourceTypes: SUB_TYPES}
                });
            }
            /*
             * Otherwise listed and not listed URLs are both opened here (no rules)
             * or both aren't (the default rules are enough).
             */
        });

        if (rules.length > 0) {
            /* the extension pages are never touched, whatever the list contains */
            rules.push({
                id: RULE_ID.SELF,
                priority: PRIORITY.SELF,
                action: {type: "allow"},
                condition: {urlFilter: "|" + EXTENSION_ROOT, resourceTypes: ALL_TYPES}
            });
        }

        return rules;
    }

    let syncing = Promise.resolve();
    function sync () {
        syncing = syncing.then(function () {
            const sources = QUR.whitelist.map((entry) => entry.getRegexSource());

            return Promise.all(sources.map(isSupported))
                .then(function (supported) {
                    const usable = sources.filter(function (source, i) {
                        if (!supported[i]) {
                            console.error(console_prefix + "entry ignored, unsupported regexp: " + source);
                        }
                        return supported[i];
                    });

                    return dnr.getDynamicRules().then(function (oldRules) {
                        return dnr.updateDynamicRules({
                            removeRuleIds: oldRules.map((r) => r.id),
                            addRules: makeRules(usable)
                        });
                    });
                })
                .then(() => console.info(console_prefix + "rules updated"));
        }).catch(function (error) {
            QUR.fatal(console_prefix + "unable to update the rules: " + String(error && error.message || error));
        });

        return syncing;
    }

    /*
     * Listeners registered synchronously
     */

    /* a new top level navigation resets the blocked resources of the tab */
    chrome.webRequest.onBeforeRequest.addListener(function (details) {
        if (details.tabId !== -1) {
            QUR.tabs.clearBlockedRes(details.tabId);
        }
    }, {urls: ["http://*/*", "https://*/*"], types: ["main_frame"]});

    /* resources blocked by the rules, shown in the popup */
    chrome.webRequest.onErrorOccurred.addListener(function (details) {
        if (details.error !== "net::ERR_BLOCKED_BY_CLIENT" || details.tabId === -1) {
            return;
        }

        QUR.ready.then(function () {
            /* another extension could have blocked it */
            if (actionFor(details.url) !== QUR.settings.ACTION.OPEN_HERE) {
                QUR.tabs.addBlockedRes(details);
            }
        });
    }, {urls: ["<all_urls>"]});

    /* a top level navigation redirected to the firewall page */
    QUR.messaging.addListener({
        msg: QUR.messaging.MSG.FIREWALL_HIT,
        handler (details) {
            const {sendResponse, sender, options:url} = details;

            const fromFirewallPage = Boolean(sender.tab) && sender.frameId === 0 &&
                  typeof sender.url === "string" && sender.url.startsWith(FIREWALL_PAGE);
            if (!fromFirewallPage || typeof url !== "string" || !(/^https?:\/\//i).test(url)) {
                sendResponse(null);
                return;
            }

            const ACTION = QUR.settings.ACTION;
            const action = actionFor(url);

            if (action === ACTION.DVM) {
                QUR.native.openurl({vmname: "$dispvm", url});
            } else if (action === ACTION.DEFAULT_VM) {
                QUR.native.openurl({vmname: QUR.settings.getDefaultVm(), url});
            }

            if (action !== ACTION.OPEN_HERE) {
                QUR.tabs.addBlockedRes({tabId: sender.tab.id, url, type: "main_frame"});
            }

            console.warn(console_prefix + url + " handled with the action " + action);
            sendResponse({action});
        }
    });

    QUR.ready.then(function () {
        /* an entry is refused if it can't become a rule */
        QUR.whitelist.addValidator(function (entry, newList) {
            const neededRules = 2 * newList.length + 3;
            if (neededRules > dnr.MAX_NUMBER_OF_REGEX_RULES) {
                return Promise.resolve(false);
            }
            return isSupported(entry.getRegexSource());
        });

        QUR.settings.onChanged.addListener(sync);
        QUR.whitelist.onChanged.addListener(sync);

        return sync();
    });
}());
