'use strict';

function init(loggedIn) {
	if (!loggedIn) {
		window.location.href = './signin.html?page=noemail.html';
		return;
	}
	var um = new UnsubscribeManager();
}
pm.addCB(init);

function UnsubscribeManager() {
	var self = this;

	self.apigClient = apigClientFactory.newClient();
	$('#unsubscribe').click(function () {
		var params = {};
		var body = {
			symbol: null,
			enabled: false
		};
		var additionalParams = {
			headers: {
				Authorization: pm.accountManager.idToken.getJwtToken()
			},
			queryParams: {}
		};
		self.apigClient.setinvestmentemailPost(params, body, additionalParams)
			.then(function (result) {
				$('#unsubscribe').addClass('disabled');
				$('#unsubscribe').text('Unsubscribed');
				Materialize.toast("Unsubscribe Successful", 4000);
			}).catch(function (err) {
				console.log("Unsub Err: " + err);
			});
	});
}
