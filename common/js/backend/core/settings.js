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

    const ACTION = Object.freeze({
        DVM: 0,
        DEFAULT_VM: 1,
        OPEN_HERE: 2,
        BLOCK_ONLY: 3
    });

    /*
     * default_action: applied to URLs that don't match any entry of the list
     * list_action: applied to URLs that match an entry of the list
     *
     * By default everything is opened here and the list is a blacklist
     * whose entries are opened in a disposable qube.
     * The list acts as a whitelist when list_action is OPEN_HERE.
     */
    const _settings = {
        default_action: ACTION.OPEN_HERE,
        list_action: ACTION.DVM,
        default_vm: null
    };

    const isValidVmName = (v) => (typeof v === "string" && v !== "") || (v === null);
    const isValidAction = (v) => Object.values(ACTION).some((x) => x === v);
    function isValidSettings (settings) {
        const {default_action, list_action, default_vm} = settings;
        if (!isValidAction(default_action) || !isValidAction(list_action) || !isValidVmName(default_vm)) {
            return false;
        }

        const requireVmName = default_action === ACTION.DEFAULT_VM || list_action === ACTION.DEFAULT_VM;
        /* default_vm could be null */
        if (requireVmName && !default_vm) {
            return false;
        }

        return true;
    }

    const persist = (settings) => browser.storage.local.set({"settings": settings});
    const listeners = [];
    const onChanged = Object.freeze({
        addListener (listener) {
            if (typeof listener === "function") {
                listeners.push(listener);
                return true;
            }
            return false;
        }
    });


    const publicSettings = Object.freeze({
        ACTION,
        getDefaultAction: () => _settings.default_action,
        getListAction: () => _settings.list_action,
        getDefaultVm: () => _settings.default_vm,
        toString: () => JSON.stringify(_settings),
        toJSON: () => Object.assign({}, _settings),
        onChanged,
        set (settings) {
            const {default_vm = _settings.default_vm} = settings;
            const {default_action = _settings.default_action} = settings;
            const {list_action = _settings.list_action} = settings;
            const newSettings = {default_action, list_action, default_vm};

            if (!isValidSettings(newSettings)) {
                return Promise.resolve(false);
            }

            return persist(newSettings).then(function () {
                _settings.default_vm = default_vm;
                _settings.default_action = default_action;
                _settings.list_action = list_action;

                window.setTimeout(function () {
                    listeners.forEach((l) => l());
                }, 0);

                return Promise.resolve(true);
            });
        }
    });

    /* initialization of settings */
    browser.storage.local.get("settings")
        .then(function (result) {
            /* settings saved by an older version lack some properties */
            const stored = Object.assign({}, _settings, result.settings);
            if (isValidSettings(stored)) {
                return stored;
            }
            return _settings;
        })
        .then(publicSettings.set)
        .then(function () {
            QUR.settings = publicSettings;
            console.info("[QUR.settings] initialized");
        })
        .catch(function (error) {
            const msg = [
                "Error during QUR.settings initialization: " + error.toString(),
                "The extension will not work!"
            ].join("\n");
            QUR.fatal(msg);
        });
}());
