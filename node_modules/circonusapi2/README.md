node-circonusapi2
=================

Node lib for interacting with v2 of the Circonus API

Exported methods
----------------
 * setup:  inital setup function to give the API your auth token, app name, and options
 * get, post, put, delete: proxies for the various HTTP methods used for REST calls
 
Notes
-----
 * callback functions take 3 args (code, error, body)
    * code:   HTTP Response code, if null a non HTTP error occurred
    * error:  Error message from API, null on 200 responses
    * body:   Response body, i.e. the thing you probably want, if it wasn't null you will be handed an already parsed object

Usage
-----
    var api = require('circonusapi2'),
        auth_token = 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE',
        app_name = 'TEST APP';

    api.setup(auth_token, app_name);
    api.get("/check_bundle/12345", null, function(code, error, body) {
      if ( ! error ) {
        console.log(body)
      }
    ));

Options
-----
* protocol : "http" or "https", default https
* apihost : default "api.circonus.com"
* apiport : default 443
* apipath : default "/v2/"