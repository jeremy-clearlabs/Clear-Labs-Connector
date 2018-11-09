/**
 * @returns {Object} the authentication type for the connector.
 */
function getAuthType() {
  return {
    type: 'USER_PASS'
  };
}

/**
 * Clears any credentials stored for the user for the third-party service.
 */
function resetAuth() {
  var userProperties = PropertiesService.getUserProperties();
  userProperties.deleteProperty('dscc.username');
  userProperties.deleteProperty('dscc.password');
  userProperties.deleteProperty('dscc.accessToken');
}

/**
 * Check if the provided username and password are valid through a
 * call to your service. You would have to have a `checkForValidCreds`
 * function defined for this to work.
 * @param {String} email 
 * @param {String} password 
 * @returns {Boolean|String} Returns false or access token
 */
function checkForValidCreds(email, password) {
  if (!email || !password) {
    return false;
  }

  var body = JSON.stringify({ email: email, password: password });
  // POST /login
  var response = UrlFetchApp.fetch('https://api-dev.clearlabs.com/login', {
    method: 'post',
    body: body
  });

  Logger.log(response.getContentText());

  // Check if access token is returned
  if (!response) {
    return false;
  }
  var res = response.json();

  if (res.access_token) {
    return res.access_token;
  }

  return false;
}

// Validate if the email and password are correct.
function validateCredentials(email, password) {
  if (!email || !password) {
    return false;
  }

  var body = JSON.stringify({ email: email, password: password });
  // POST /login
  var response = UrlFetchApp.fetch('https://api-dev.clearlabs.com/login', {
    method: 'post',
    body: body
  });

  Logger.log(response.getContentText());

  // Check if access token is returned
  if (!response) {
    return false;
  }
  var res = response.json();

  return !!res.access_token;
}

/**
 * This function is called to determine if the authentication for the
 * third-party service is valid. If authentication is valid then it is
 * expected that calls to getData() and getSchema() will not fail due
 * to unauthorized access. If the auth is not valid then the user may
 * receive a notification to start the authorization flow.
 */
function isAuthValid() {
  var userProperties = PropertiesService.getUserProperties();
  var userName = userProperties.getProperty('dscc.username');
  var password = userProperties.getProperty('dscc.password');

  return validateCredentials(userName, password);
}

/**
 * `setCredentials` is called after the user enters either their `USER_PASS` or
 * `KEY` information on the community connector configuration page.
 * You should use the [Properties Service](https://clearlabs.page.link/rniX)
 * to save the credentials on a per-user basis using UserProperties.
 * @returns {Object} Error object with error or no error
 */
function setCredentials(request) {
  var creds = request.userPass;
  var username = creds.username;
  var password = creds.password;

  var accessToken = checkForValidCreds(username, password);
  if (!accessToken) {
    return {
      errorCode: 'INVALID_CREDENTIALS'
    };
  }
  var userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty('dscc.username', username);
  userProperties.setProperty('dscc.password', password);
  userProperties.setProperty('dscc.accessToken', accessToken);

  return {
    errorCode: 'NONE'
  };
}

/**
 * This checks whether the current user is an admin user of the connector.
 *
 * @returns {boolean} Returns true if the current authenticated user at the time
 * of function execution is an admin user of the connector. If the function is
 * omitted or if it returns false, then the current user will not be considered
 * an admin user of the connector.
 */
function isAdminUser() {
  return true;
}
