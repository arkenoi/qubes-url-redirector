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

    let _whitelist = [];

    const findIndex = (entry) => _whitelist.findIndex((x) => x.toString(true) === entry.toString(true));

    const getCloned = () => _whitelist.slice(0);
    const persist = (whitelist) => browser.storage.local.set({"whitelist": JSON.parse(JSON.stringify(whitelist))});

    const listeners = [];
    const notify = () => setTimeout(() => listeners.forEach((l) => l()), 0);
    const onChanged = Object.freeze({
        addListener (listener) {
            if (typeof listener === "function") {
                listeners.push(listener);
                return true;
            }
            return false;
        }
    });

    /*
     * Validators are functions that receive an entry and the entries that the
     * list will contain. They return a promise resolved with true if the
     * entry is acceptable.
     */
    const validators = [];
    function isAccepted (entry, newList) {
        return Promise.all(validators.map((v) => v(entry, newList)))
            .then((results) => results.every((r) => r === true));
    }

    const that = QUR.whitelist_entries;
    const publicWhitelist = Object.freeze({
        toString: () => _whitelist.toString(),
        toJSON: () => _whitelist.slice(0),
        forEach: (fn) => getCloned().forEach(fn),
        map: (fn) => getCloned().map(fn),
        onChanged,
        addValidator (validator) {
            if (typeof validator === "function") {
                validators.push(validator);
                return true;
            }
            return false;
        },
        isEmpty: () => _whitelist.length === 0,
        isWhitelisted: (value) => _whitelist.some((x) => x.test(value)),
        getMatchedEntry (value) {
            const entry = _whitelist.find((e) => e.test(value));
            return entry !== undefined ? entry : null;
        },
        getFromString (s) {
            const i = findIndex({toString: () => s});
            if (i === -1) {
                return null;
            }

            return _whitelist[i];
        },
        add (entry) {
            if (!that.isValidEntry(entry) || findIndex(entry) >= 0) {
                return Promise.resolve(false);
            }

            const cloned = getCloned();
            cloned.push(entry);
            return isAccepted(entry, cloned).then(function (accepted) {
                if (!accepted) {
                    return false;
                }
                return persist(cloned).then(function () {
                    _whitelist.push(entry);
                    notify();
                    return true;
                });
            });
        },
        rm (entry) {
            if (!that.isValidEntry(entry)) {
                return Promise.resolve(false);
            }

            const i = findIndex(entry);
            if (i === -1) {
                return Promise.resolve(false);
            }

            const cloned = getCloned();
            cloned.splice(i, 1);
            return persist(cloned).then(function () {
                _whitelist.splice(i, 1);
                notify();
                return Promise.resolve(true);
            });
        },
        replace (oldEntry, newEntry) {
            if (!that.isValidEntry(oldEntry) || !that.isValidEntry(newEntry)) {
                return Promise.resolve(false);
            }

            const i = findIndex(oldEntry);
            const j = findIndex(newEntry);
            if (i === -1 || (j >= 0 && i !== j)) {
                return Promise.resolve(false);
            }

            const cloned = getCloned();
            cloned[i] = newEntry;
            return isAccepted(newEntry, cloned).then(function (accepted) {
                if (!accepted) {
                    return false;
                }
                return persist(cloned).then(function () {
                    _whitelist[i] = newEntry;
                    notify();
                    return true;
                });
            });
        },
        clear () {
            return persist([]).then(function () {
                _whitelist = [];
                notify();
                return Promise.resolve(true);
            });
        }
    });

    browser.storage.local.get("whitelist")
        .then(function (result) {
            const whitelist = result.whitelist;
            if (Array.isArray(whitelist)) {
                return whitelist.map(that.makeEntry).filter((e) => e !== null);
            }

            return _whitelist;
        })
        .then((whitelist) => whitelist.forEach((e) => _whitelist.push(e)))
        .then(() => persist(_whitelist))
        .then(function () {
            QUR.whitelist = publicWhitelist;
            console.info("[QUR.whitelist] initialized");
        })
        .catch(function (error) {
            const msg = [
                "Error during QUR.whitelist initialization: " + error.toString(),
                "The extension will not work!"
            ].join("\n");
            QUR.fatal(msg);
        });
}());
