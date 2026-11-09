.PHONY: help setup chrome chromium firefox clean zip xpi crx

# local stuff
VERSION=v3.0.1.1

# used only by the crx target: the private key that determines CHROME_ID
# (it must match the "key" in chrome/manifest.json) and the browser used to pack
CRX_KEY=
CHROMIUM_BIN=chromium-browser
BUILD_D=build

NATIVE_MANIFEST=qvm_open_in_vm.json
NATIVE_BIN=qvm-open-in-vm-we.py

PACKAGES_D=packages
ZIP_D=${PACKAGES_D}/zip

CHROME_ID=lhlnoacbghnakdblgdmkafbcdhglohen
FIREFOX_ID=qubes-url-redirector@arkenoi

CHROME_CRX=${PACKAGES_D}/chrome-${VERSION}.crx
FIREFOX_XPI=${PACKAGES_D}/firefox-${VERSION}.xpi

# installation dir
QUR_D=/opt/qubes-url-redirector

CHROME_NATIVE_D=/etc/opt/chrome/native-messaging-hosts
CHROME_EXT_D=/usr/share/google-chrome/extensions

CHROMIUM_NATIVE_D=/etc/chromium/native-messaging-hosts
CHROMIUM_EXT_D=/usr/share/chromium/extensions

FIREFOX_NATIVE_D=/usr/lib/mozilla/native-messaging-hosts
FIREFOX_EXT_D=/usr/share/mozilla/extensions/{ec8030f7-c20a-464f-9b0e-13a3a9e97384}

# macro
INSTALL=install -m644
INSTALL_EXE=install -m755

help:
	@echo make help to show this help
	@echo make chrome to install in Chrome
	@echo make chromium to install in Chromium
	@echo make firefox to install in Firefox
	@echo make xpi to build the unsigned Firefox package
	@echo make crx CRX_KEY=/path/to/key.pem to build the Chrome/ium package
	@echo make zip to build the zip packages of both browsers
	@echo make clean to remove file on disk

setup:
	${INSTALL_EXE} -Dt ${QUR_D} common/${NATIVE_BIN}

chrome: setup
	${INSTALL} -Dt ${CHROME_EXT_D} chrome/${CHROME_ID}.json
	${INSTALL} -t ${QUR_D} ${CHROME_CRX}
	${INSTALL} -Dt ${CHROME_NATIVE_D} chrome/NativeMessagingHosts/${NATIVE_MANIFEST}

chromium: setup
	${INSTALL} -Dt ${CHROMIUM_EXT_D} chrome/${CHROME_ID}.json
	${INSTALL} -t ${QUR_D} ${CHROME_CRX}
	${INSTALL} -Dt ${CHROMIUM_NATIVE_D} chrome/NativeMessagingHosts/${NATIVE_MANIFEST}

xpi:
	rm -f ${FIREFOX_XPI}
	cd firefox && zip -x @../${ZIP_D}/exclude.lst -qr ../${FIREFOX_XPI} -9 -X .

crx: zip
	@test -n "${CRX_KEY}" || { echo "usage: make crx CRX_KEY=/path/to/key.pem"; exit 1; }
	rm -rf ${BUILD_D}
	mkdir -p ${BUILD_D}/chrome
	unzip -q ${ZIP_D}/chrome-latest.zip -d ${BUILD_D}/chrome
	${CHROMIUM_BIN} --no-message-box --pack-extension=${CURDIR}/${BUILD_D}/chrome --pack-extension-key=${CRX_KEY}
	mv ${BUILD_D}/chrome.crx ${CHROME_CRX}
	rm -rf ${BUILD_D}

firefox: setup
	${INSTALL} -D ${FIREFOX_XPI} ${FIREFOX_EXT_D}/${FIREFOX_ID}.xpi
	${INSTALL} -Dt ${FIREFOX_NATIVE_D} firefox/native-messaging-hosts/${NATIVE_MANIFEST}

clean:
	rm -rf ${QUR_D}

	rm -f ${FIREFOX_NATIVE_D}/${NATIVE_MANIFEST}
	rm -f ${FIREFOX_EXT_D}/${FIREFOX_ID}.xpi

	rm -f ${CHROME_NATIVE_D}${NATIVE_MANIFEST}
	rm -f ${CHROME_EXT_D}/${CHROME_ID}.json

	rm -f ${CHROMIUM_NATIVE_D}/${NATIVE_MANIFEST}
	rm -f ${CHROMIUM_EXT_D}/${CHROME_ID}.json

zip:
	rm -f ${ZIP_D}/chrome-latest.zip
	rm -f ${ZIP_D}/firefox-latest.zip
	cd chrome && zip -x @../${ZIP_D}/exclude.lst -qr ../${ZIP_D}/chrome-latest.zip -9 -X .
	cd firefox && zip -x @../${ZIP_D}/exclude.lst -qr ../${ZIP_D}/firefox-latest.zip -9 -X .
