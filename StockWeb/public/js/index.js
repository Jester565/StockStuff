'use strict';

function init(loggedIn) {
	if (loggedIn) {
		window.location.href = './home.html';
	}
}
pm.addCB(init);
