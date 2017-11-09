'use strict';

console.log("load");
function init(loggedIn) {
	var fpm = new ForgotPwdManager();
}
pm.addCB(init);

function ForgotPwdManager() {
	$('#pinModal').modal({
		dismissible: false
	});
	var self = this;
	AWSCognito.config.region = 'us-west-2';

	var poolData = {
		UserPoolId: 'us-west-2_MY0MuTkaP',
		ClientId: '1vgit8ouhmjcnh0grvqhhr7gi8'
	};
	self.userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);

	$('#sendCodeButton').click(function () {
		console.log("Send code button");
		var username = $('#username').val();
		var userData = {
			Username: username,
			Pool: self.userPool
		};
		self.cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
		self.cognitoUser.forgotPassword({
			onSuccess: function (result) {
				var pwd = $('#password').val();
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
						window.location.href = './home.html';
					},
					onFailure: function (err) {
						window.location.href = './signin.html';
					}
				});
			},
			onFailure: function (err) {
				Materialize.toast(err, 4000);
			},
			inputVerificationCode() {
				console.log("Verification Code");
				$('#pinModal').modal('open');
				self.verificationCodeContext = this;
			}
		});
	});

	$('#confirmCodeButton').click(function () {
		var verificationCode = $('#confCode').val();
		var pwd = $('#password').val();
		var confPwd = $('#confirmPassword').val();
		if (pwd != confPwd) {
			Materialize.toast("Passwords don't match", 3000);
			return;
		}
		self.cognitoUser.confirmPassword(verificationCode, pwd, self.verificationCodeContext);
	});
}

