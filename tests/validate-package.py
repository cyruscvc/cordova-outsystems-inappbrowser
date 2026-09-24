"""Static validation for this Git-distributed replacement (not a Resource ZIP)."""
import json
import pathlib
import xml.etree.ElementTree as ET
import zipfile

root = pathlib.Path(__file__).resolve().parents[1]
plugin = ET.parse(root / 'plugin.xml').getroot()
ns = {'p': 'http://apache.org/cordova/ns/plugins/1.0'}
package = json.loads((root / 'package.json').read_text())
lock = json.loads((root / 'package-lock.json').read_text())
assert plugin.attrib['id'] == package['name'] == package['cordova']['id']
assert plugin.attrib['version'] == package['version'] == lock['version'] == lock['packages']['']['version']
for kind in ('source-file', 'js-module', 'hook'):
    for item in plugin.findall('.//p:' + kind, ns):
        assert (root / item.attrib['src']).is_file(), item.attrib['src']
assert 'msteams' in (root / 'plugin.xml').read_text()
assert 'OSInAppBrowserLib-iOS' not in (root / 'Package.swift').read_text()
aar = root / 'src/android/libs/ioninappbrowser-android-2.0.3-mapp.1.aar'
with zipfile.ZipFile(aar) as archive:
    assert 'assets/osiab-download.js' in archive.namelist()
    assert 'classes.jar' in archive.namelist()
print('PASS: identity, versions, source manifest, Teams scheme, vendored iOS, download bridge AAR')
