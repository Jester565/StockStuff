'use strict';

var pm = new PageManager();

function PageManager() {
	var self = this;
	self.cbs = [];
	self.ready = false;
	self.loggedIn = false;
	$(document).ready(function () {
		$('#navInclude').load('./navbar.html', function() {
			//Create CognitoManager
			$('.signOutNB').click(function () {
				AWS.config.credentials.clearCachedId();
				self.accountManager.signOut();
				window.location.href = './index.html';
			});
			$(".dropdown-button").dropdown();
			$('.button-collapse').sideNav();
			//Initialize Account Manager
			self.accountManager = new AccountManager();

			self.accountManager.getCreds(function (error) {
				if (error) {
					self.loggedIn = false;
					$('.loggedOut').show();
				} else {
					self.loggedIn = true;
					//$('.usernameNB').text(self.accountManager.getUsername());
					$('.loggedIn').show();
					$('.usernameNB').each(function (idx) {
						var elm = $(this);
						elm.html(self.accountManager.getUsername() + elm.html());
					});
				}
				$('.preloader-wrapper').hide();
				$('#pageContent').show();
				self.ready = true;
				for (var cb of self.cbs) {
					cb(self.loggedIn);
				}
			});
		});
	});

	self.addCB = function (cb) {
		if (self.ready) {
			cb(self.loggedIn);
		} else {
			self.cbs.push(cb);
		}
	}
};
