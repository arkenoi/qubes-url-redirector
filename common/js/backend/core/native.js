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

QUR.native = Object.freeze({
    openurl (details) {
        "use strict";
        const {vmname, url} = details;
        /* the native application doesn't reply, so the promise could be rejected */
        Promise.resolve(browser.runtime.sendNativeMessage("qvm_open_in_vm", {vmname, url}))
            .catch((error) => console.info("[QUR.native] " + String(error && error.message || error)));
    }
});
