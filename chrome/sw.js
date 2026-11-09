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

/* Manifest V3 background: every listener is registered at startup */
importScripts(
    "common/js/browser.js",

    "common/js/backend/main.js",
    "backend/tabs.js",
    "common/js/backend/net_utils.js",

    "common/js/backend/core/settings.js",
    "common/js/backend/core/whitelist_entries.js",
    "common/js/backend/core/whitelist.js",
    "common/js/backend/core/native.js",

    "common/js/backend/messaging/messaging.js",
    "common/js/backend/messaging/settingsML.js",
    "common/js/backend/messaging/whitelistML.js",
    "common/js/backend/messaging/tabsML.js",

    "backend/dnr.js",

    "common/js/backend/menu.js"
);
