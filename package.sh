npm install
wpsjs build
wpsjs publish -s http://10.20.134.53/wps-plugin/
# wpsjs publish -s http://localhost/wps-plugin/
cp wps-addon-publish/publish.html wps-addon-build/
tar -zcvf wps-plugin.tar.gz wps-addon-build 
sudo chmod 755 wps-plugin.tar.gz
