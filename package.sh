npm install
wpsjs build
wpsjs publish -s http://localhost/wps-plugin/
cp wps-addon-publish/publish.html wps-addon-publish/
tar -zcvf wps-plugin.tar.gz wps-addon-publish 
