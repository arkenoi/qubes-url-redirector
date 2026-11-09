/*
 * Copyright (C) 2017,2018 Raffaele Florio <raffaeleflorio@protonmail.com>
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

(function () {
    "use strict";

    /*
     * The blocked URL is in the "url" parameter (blocking webRequest, Firefox)
     * or it is the fragment (declarativeNetRequest redirection, Chrome/ium).
     * In the latter case the background is asked to handle the URL.
     */
    const fromQuery = new URL(window.location.href).searchParams.get("url");
    const fromFragment = window.location.hash.slice(1);
    const url = fromQuery || fromFragment;

    const blocked_url = document.getElementById("blocked_url");
    blocked_url.textContent = url;
    if ((/^(?:https?|wss?|ftp|file):\/\//i).test(url)) {
        blocked_url.setAttribute("href", url);
    }

    if (fromQuery || !(/^https?:\/\//i).test(fromFragment)) {
        return;
    }

    const OUTCOME = [
        "The following URL has been redirected to a disposable qube:",
        "The following URL has been redirected to the default qube:",
        "The following URL isn't blocked anymore:",
        "The following URL has been blocked:"
    ];
    const outcome = document.getElementById("outcome");
    const STATE_KEY = "qur_action";

    /* don't redirect again on reload, history navigation or session restore */
    const state = window.history.state;
    if (state && typeof state[STATE_KEY] === "number") {
        outcome.textContent = OUTCOME[state[STATE_KEY]] || OUTCOME[3];
        return;
    }

    const MSG_FIREWALL_HIT = {msg: 7};
    browser.runtime.sendMessage({...MSG_FIREWALL_HIT, options: fromFragment})
        .then(function (response) {
            if (!response || typeof response.action !== "number") {
                return;
            }
            window.history.replaceState({[STATE_KEY]: response.action}, "");
            outcome.textContent = OUTCOME[response.action] || OUTCOME[3];
        })
        .catch((error) => console.error(error));
}());
