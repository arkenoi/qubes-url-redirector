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

/*
 * The click listener is registered synchronously: a non persistent background
 * (e.g. a service worker) could be started by the click itself.
 */
browser.contextMenus.onClicked.addListener(function (info) {
    "use strict";

    const id = info.menuItemId;
    const url = info.linkUrl;

    QUR.ready.then(function () {
        if (id === "open-in-dvm") {
            QUR.native.openurl({vmname: "$dispvm", url});
        } else if (id === "open-in-default-vm") {
            QUR.native.openurl({vmname: QUR.settings.getDefaultVm(), url});
        } else if (id === "open-here") {
            QUR.tabs.create({url: "about:blank", oneTimeWhitelisted: true, targetUrl: url});
        }
    });
});

QUR.ready.then(function () {
    "use strict";

    const defaultVmTitle = (vm) => "Open in " + (vm === null ? "default qube" : vm);

    /* the entries could be still there if the background isn't persistent */
    Promise.resolve(browser.contextMenus.removeAll()).then(function () {
        browser.contextMenus.create({
            id: "open-in-dvm",
            title: "Open in a disposable qube",
            contexts: ["link"],
            enabled: true
        });

        const vm = QUR.settings.getDefaultVm();
        browser.contextMenus.create({
            id: "open-in-default-vm",
            title: defaultVmTitle(vm),
            contexts: ["link"],
            enabled: (vm !== null)
        });

        browser.contextMenus.create({
            id: "open-here",
            title: "Open here",
            contexts: ["link"],
            enabled: true
        });
    });

    QUR.settings.onChanged.addListener(function () {
        const vm = QUR.settings.getDefaultVm();
        browser.contextMenus.update(
            "open-in-default-vm",
            {
                title: defaultVmTitle(vm),
                enabled: (vm !== null)
            });
    });
});
