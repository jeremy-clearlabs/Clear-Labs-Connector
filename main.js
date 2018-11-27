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
  var response = UrlFetchApp.fetch('http://api-dev.clearlabs.com/login', {
    method: 'POST',
    payload: body,
    muteHttpExceptions: true
  });

  console.log('checkForValidCreds', response.getContentText());

  // Check if access token is returned
  if (!response) {
    return false;
  }
  var res = JSON.parse(response);
  Logger.log(res);

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

  console.log('creating login request body');
  var body = JSON.stringify({ email: email, password: password });
  var options = {
    method: 'post',
    payload: body
  };
  console.log(options);

  var response = UrlFetchApp.fetch(
    'http://api-dev.clearlabs.com/login',
    options
  );

  console.log(response.getContentText());

  // Check if access token is returned
  if (!response) {
    return false;
  }
  var res = JSON.parse(response);

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
  Logger.log('setCredentials', request);
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
  // var userProperties = PropertiesService.getUserProperties();
  // var accessToken = userProperties.getProperty('dscc.accessToken');
  // return !!accessToken;
  return true;
}

function getCompanyCount() {
  console.log('getCompanyCount');
  var userProperties = PropertiesService.getUserProperties();
  var accessToken = userProperties.getProperty('dscc.accessToken');
  if (!accessToken) {
    console.log('User not logged in');
    return {
      errorCode: 'User not logged in'
    };
  }

  var options = {
    method: 'post',
    headers: {
      authorization: 'Bearer ' + accessToken,
      'content-type': 'application/json'
    },
    payload:
      '{"query":"query getAllCompanies { allCompanies { name, id, labs { id, name } } }","operationName":"getAllCompanies"}'
  };
  Logger.log(options);

  var response = UrlFetchApp.fetch(
    'http://api-dev.clearlabs.com/graphql',
    options
  );

  console.log(response.getContentText());

  var res = JSON.parse(response);
  try {
    return res.data.allCompanies.length;
  } catch (error) {
    return new Error('Data malformed');
  }
}

function getConfig(request) {
  var config = {
    configParams: [
      {
        type: 'INFO',
        name: 'Instructions',
        text: 'Enter the env url e.g. dev, qa, staging, prod.'
      },
      {
        type: 'TEXTINPUT',
        name: 'env',
        displayName: 'Env URL',
        helpText: 'e.g. dev, qa, staging, prod',
        placeholder: 'env url'
      }
    ],
    dateRangeRequired: false
  };
  return config;
}

var dataSchema = [
  {
    name: 'companyCount',
    dataType: 'NUMBER',
    semantics: {
      conceptType: 'METRIC',
      semanticType: 'NUMBER',
      isReaggregatable: true
    },
    defaultAggregationType: 'SUM'
  }
];

function getSchema(request) {
  return { schema: dataSchema };
}

function getData(request) {
  console.log('getData', request);
  var dataFetcher = [];
  // Create schema for requested fields
  var requestedSchema = request.fields.map(function(field) {
    for (var i = 0; i < dataSchema.length; i++) {
      if (dataSchema[i].name === field.name) {
        // Setup data fetcher
        dataFetcher.push(getCompanyCount);
        return dataSchema[i];
      }
    }
  });

  console.log('schema', requestedSchema);

  // Fetch and parse data from API
  var responseData = [];
  dataFetcher.forEach(function(fetch) {
    var response = fetch();
    responseData.push(response);
  });

  console.log('responseData', responseData);

  var requestedData = responseData.map(function(companyCount) {
    var values = [];
    // only have company count
    values.push(companyCount);

    return { values: values };
  });

  return {
    schema: requestedSchema,
    rows: requestedData
  };
}
