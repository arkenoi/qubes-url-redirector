# qubes-url-redirector v3.0.1.1
This is a browser extension, aimed to improve surfing security. It's written for Qubes OS using standard WebExtension APIs and it allows you to manage which qube is responsible to open URLs. Obviously redirection happens before any TCP connection is opened. Furthermore, through context menu entries, you can open a specific link in a custom way.

It has a settings page embedded in browser where you customize default behavior and it supports a URL list based on Javascript's RegExp, in this way there is a lot of flexibility to define which URLs are handled differently. Settings page is also accessible through the browser's toolbar button.

This is a fork of [raffaeleflorio/qubes-url-redirector](https://github.com/raffaeleflorio/qubes-url-redirector) with different defaults. It has its own extension IDs (and its own Chrome/ium package key), so it's a distinct add-on from the upstream one.

## Defaults
Out of the box nothing is blocked or redirected and no welcome page is shown:
- **Default action** (URLs that don't match the list): *Open here*.
- **Action for listed URLs**: *Open in a disposable qube*. So the URL list is a **blacklist**, initially empty.

Both actions are configurable (open here, disposable qube, default qube, block only). To get the old whitelist behavior set the action for listed URLs to *Open here* and the default action to something else.

# Screenshots
**Settings**
![settings](https://raw.githubusercontent.com/raffaeleflorio/qubes-url-redirector/master/common/screenshots/settings.png)
**Menus with a default qube setted**<br>
![menus](https://raw.githubusercontent.com/raffaeleflorio/qubes-url-redirector/master/common/screenshots/menus.png)

You can see more screenshots in the `common/screenshots` directory.

# How to install
After the beta there will be a signed rpm package. Now you need to follow these steps.

## Clone the repo

If the target browser is Chrome/ium you need clone the repo with the `recursive` flag (because of the ([webextension-browser-proxy submodule](https://github.com/raffaeleflorio/webextension-browser-proxy)):
```
$ git clone --recurse-submodules https://github.com/arkenoi/qubes-url-redirector.git
```
Otherwise you can clone the submodule separately with:
```
qubes-url-redirector/cloned/repo $ git submodule update --init --recursive
```

## Check the signatures (it's optional, but strongly recommended):
Every upstream commit (up to v3.0.1_beta) is signed by the original author; the commits of this fork are not. You can get the upstream key [from raffaeleflorio.github.io](https://raffaeleflorio.github.io/resources/pgp.asc) or [from pgp.mit.edu](https://pgp.mit.edu/pks/lookup?op=get&search=0x0deff00a47cf317f). The **fingerprint** is: _6F1B 35D5 4A43 864C 62D3  ACC3 0DEF F00A 47CF 317F_. The fingerprint is also available in multiple keyserver.

Import the key and verify its fingerprint in gpg:
```
$ gpg --import /path/to/the/key
$ gpg -k --fingerprint "Raffaele Florio"
```

To check **every** commit signature:
```
qubes-url-redirector/cloned/repo $ git log --show-signature
```

To limit the check to *a_number* of commits:
```
qubes-url-redirector/cloned/repo $ git log --show-signature -*a_number*
```

## Firefox installation
```
qubes-url-redirector/cloned/repo $ make xpi
qubes-url-redirector/cloned/repo # make firefox
```
The package built by `make xpi` is not signed by Mozilla. It's accepted by Firefox builds that allow unsigned add-ons in the system directories (e.g. the Fedora and Debian ones) or with `xpinstall.signatures.required` set to `false` (ESR, Developer Edition, Nightly). Otherwise load it from `about:debugging`.

## Chrome/ium package
The `packages/chrome-*.crx` package is built with `make crx CRX_KEY=/path/to/key.pem`. The key determines the extension ID: with a different key you have to update `CHROME_ID` in the Makefile, the `key` in `chrome/manifest.json`, the name of `chrome/<id>.json` and the origin in `chrome/NativeMessagingHosts/qvm_open_in_vm.json`. Note that the extension uses Manifest V2.

## Chrome installation
`qubes-url-redirector/cloned/repo # make chrome`

## Chromium installation
`qubes-url-redirector/cloned/repo # make chromium`

---

That's all! :D
If you encounter some problems, don't hesitate to contact me!

# Supported browser
- Firefox 52 onwards (according the API's reference).
- Chromium 42 onwards (according the API's reference).

## Schemes compatibility table
| scheme | Firefox | Chrome/ium |
|---|---|---|
| http | supported | supported |
| https | supported | supported |
| ws | supported | supported since v58 |
| wss | supported | supported since v58|
| file | not supported | supported |

# Additional info

## Other software and the system default browser
This extension is also useful with software different than browser. Its policy, in fact, will be respected by every program (e.g. Thunderbird) that opens URLs through a browser (with the add-on installed).
Furthermore every software that uses the system default browser, specified with XDG (or an equivalent standard for default application), doesn't need any configuration.
