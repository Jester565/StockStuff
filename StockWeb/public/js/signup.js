'use strict';

function init(loggedIn) {
	var sm = new SignUpManager(loggedIn);
}
pm.addCB(init);
	
function SignUpManager(loggedIn) {
	var self = this;
	if (!loggedIn) {
		$('#signUpContent').show();
		$('#pinModal').modal({
			dismissible: false
		});

		AWSCognito.config.region = 'us-west-2';

		var poolData = {
			UserPoolId: 'us-west-2_MY0MuTkaP',
			ClientId: '1vgit8ouhmjcnh0grvqhhr7gi8'
		};
		self.userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);

		$('#signUpButton').click(function () {
			var username = $('#username').val();
			var email = $('#email').val();
			var pwd = $('#password').val();
			var confirmPwd = $('#confirmPassword').val();
			console.log("username : " + username);
			console.log("PWD: " + pwd);
			if (pwd != confirmPwd) {
				Materialize.toast('Passwords did not match', 4000);
				return;
			}
			var attributeList = [];

			var dataEmail = {
				Name: 'email',
				Value: email
			};
			var attributeEmail = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute(dataEmail);

			attributeList.push(attributeEmail);

			self.userPool.signUp(username, pwd, attributeList, null, function (err, result) {
				if (err) {
					Materialize.toast(err, 4000);
					return;
				}
				self.cognitoUser = result.user;
				$('#pinModal').modal('open');
			});
		});

		$('#confirmCodeButton').click(function () {
			var confCode = $('#confCode').val();
			self.cognitoUser.confirmRegistration(confCode, true, function (err, result) {
				if (err) {
					alert(err);
					return;
				}
				var authData = {
					Username: $('#username').val(),
					Password: $('#password').val()
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
						window.location.href = "./home.html";
					},
					onFailure: function (err) {
						Materialize.toast(err, 4000);
					}
				});
			});
		});
	} else {
		$('#signOutContent').show();
		$('#signOutButton').click(function () {
			pm.accountManager.signOut();
			window.location.href = './signup.html';
		});
		$('#signOutContent').show();
	}
}
