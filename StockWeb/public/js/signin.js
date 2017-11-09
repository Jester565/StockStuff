'use strict';

function GetUrlVars() {
	var vars = [], hash;
	var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
	for (var i = 0; i < hashes.length; i++) {
		hash = hashes[i].split('=');
		vars.push(hash[0]);
		vars[hash[0]] = hash[1];
	}
	return vars;
}

function init(loggedIn) {
	var sm = new SignInManager(loggedIn);
}
pm.addCB(init);

function SignInManager(loggedIn) {
	var self = this;
	self.initLoginDisplay = function () {
		$('#signInContent').show();
		AWSCognito.config.region = 'us-west-2';

		var poolData = {
			UserPoolId: 'us-west-2_MY0MuTkaP',
			ClientId: '1vgit8ouhmjcnh0grvqhhr7gi8'
		};
		self.userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);

		self.signIn = function () {
			var username = $('#username').val();
			var pwd = $('#password').val();
			var userData = {
				Username: username,
				Pool: self.userPool
			};
			self.cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
			var authData = {
				Username: username,
				Password: pwd
			};
			var authDetails = new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails(authData);
			self.cognitoUser.authenticateUser(authDetails, {
				onSuccess: function (result) {
					AWS.config.credentials = new AWS.CognitoIdentityCredentials({
						IdentityPoolId: 'us-west-2_MY0MuTkaP',
						Logins: {
							'cognito-idp.us-west-2.amazonaws.com/us-west-2_PkZb6onNf': result.getIdToken().getJwtToken()
						}
					});
					var page = GetUrlVars()['page'];
					if (page == null) {
						page = "./home.html";
					}
					window.location.href = page;
				},
				onFailure: function (err) {
					console.log(JSON.stringify(err));
					if (err.code == 'UserNotConfirmedException') {
						$('#pinModal').modal('open');
						return;
					}
					Materialize.toast(err, 4000);
				}
			});
		};

		$('#signInButton').click(self.signIn);

		$('#forgotPwdButton').click(function () {
			window.location.href = './forgotpwd.html';
		});

		$('#confirmCodeButton').click(function () {
			var confCode = $('#confCode').val();
			self.cognitoUser.confirmRegistration(confCode, true, function (err, result) {
				if (err) {
					alert(err);
					return;
				}
				$('#pinModal').modal('close');
				self.signIn();
			});
		});

		$('#resendCodeButton').click(function () {
			self.cognitoUser.resendConfirmationCode(function (err, result) {
				if (err) {
					alert(err);
					return;
				}
				Materialize.toast("Code Sent", 4000);
			});
		});
	}
	if (!loggedIn) {
		self.initLoginDisplay();
	} else {
		$('#signOutButton').click(function () {
			pm.accountManager.signOut();
			window.location.href = './signin.html';
		});
		$('#signOutContent').show();
	}
}
