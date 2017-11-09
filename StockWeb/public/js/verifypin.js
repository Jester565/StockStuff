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

$(document).ready(function () {

});

function VerifyPinManager() {
	var self = this;
	 
	self.getUsername = function () {
		var queryStringParams = GetUrlVars();
		return queryStringParams["username"];
	}
	var poolData = {
		UserPoolId: 'us-west-2_MY0MuTkaP',
		ClientId: '1vgit8ouhmjcnh0grvqhhr7gi8'
	};
	self.userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);
	var userData = {
		Username: self.getUsername(),
		Pool: userPool
	};

	self.cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);

	$('#verifyPinButton').click(function () {
		self.cognitoUser.confirmRegistration(, true, function (err, result) {
			if (err) {
				Materialize.toast(err, 4000);
				return;
			}
			
		});
	});
}
