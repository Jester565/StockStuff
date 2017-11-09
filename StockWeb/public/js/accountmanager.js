'use strict';

function AccountManager() {
	var self = this;
	self.getCreds = function (cb) {
		AWS.config.region = 'us-west-2';
		var poolData = {
			UserPoolId: 'us-west-2_MY0MuTkaP',
			ClientId: '1vgit8ouhmjcnh0grvqhhr7gi8'
		};
		self.userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);
		self.cognitoUser = self.userPool.getCurrentUser();
		if (self.cognitoUser != null) {
			self.cognitoUser.getSession(function (err, result) {
				if (result) {
					self.idToken = result.getIdToken();
					AWS.config.credentials = new AWS.CognitoIdentityCredentials({
						IdentityPoolId: 'us-west-2:f159a0df-8528-4ab6-b7be-fd5d0e527fb2',
						Logins: {
							'cognito-idp.us-west-2.amazonaws.com/us-west-2_MY0MuTkaP': result.getIdToken().getJwtToken()
						}
					});
					AWS.config.credentials.refresh((error) => {
						if (error) {
							console.log("REFRESH ERROR: " + error);
							cb(error);
						} else {
							cb(null);
						}
					});
				} else {
					console.log("GetSession ERROR: " + err);
					cb(err);
				}
			});
		} else {
			cb("CognitoUser is null");
		}
	}

	self.getUsername = function () {
		return self.cognitoUser.getUsername();
	};

	self.signOut = function () {
		self.cognitoUser.signOut();
	}
}
