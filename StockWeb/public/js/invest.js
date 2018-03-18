'use strict';

function GetTodayStr() {
	var today = new Date();
	var dd = today.getDate();
	var mm = today.getMonth() + 1; //January is 0!
	var yyyy = today.getFullYear();

	if (dd < 10) {
		dd = '0' + dd
	}

	if (mm < 10) {
		mm = '0' + mm
	}

	return yyyy + '-' + mm + '-' + dd;
}

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
	if (!loggedIn) {
		window.location.href = './index.html';
		return;
	}
	var im = new InvestManager();
}
pm.addCB(init);

function InvestManager() {
	var self = this;
	self.accountManager = new AccountManager();
	self.stockManager = new StockManager();

	self.apigClient = apigClientFactory.newClient();
	var ctx = document.getElementById("myChart").getContext('2d');
	self.config = {
		type: 'line',
		data: {
			datasets: []
		},
		options: {
			maintainAspectRatio: false,
			scales: {
				xAxes: [{
					type: 'time',
					time: {
						unit: 'month'
					}
				}]
			}
		}
	};
	self.performanceChart = new Chart(ctx, self.config);

	self.symbol = GetUrlVars()['symbol'];
	self.investments = {};
	self.iCount = 1;
	self.addInvestment = function () {
		var investmentElm = $(`
							<div class="container investContainer">
							<div class="col s10 m8 l6 z-depth-5">
							<div class="container">
									<h6 class="header center blue-text">Investment #${self.iCount}</h6>
							</div>
								<div class="input-field col s12">
									<input id="withdrawP" type="number" min="0" class="validate">
									<label for="withdrawP">Withdraw %</label>
								</div>
								<p style='display: none;' id='iCount'>${self.iCount}</p>
								<ul class="collection ruleCollection">
										
								</ul>
								<div class="center-align">
									<button class="btn-floating waves-effect waves-light deleteInvestment" type="button">
										<i class="material-icons">delete</i>
									</button>
									<button class="btn waves-effect waves-light graphInvestment" type="button">
										Graph
									</button>
									<button class="btn-floating waves-effect waves-light addRule" type="button">
										<i class="material-icons">add</i>
									</button>
								</div>
							</div>
							</div>`);
		var dropHtml = `<li><a class="dropmember">Investment #${self.iCount}</a></li>`;

		$('#investmentCollection').append(investmentElm);
		$('#investmentDropdown').append(dropHtml);
		self.addRule(investmentElm);
		self.iCount++;
	};

	$('#addInvestment').click(self.addInvestment);

	self.addRule = function (investElm) {
		var ruleHtml = `<form class="col s12 ruleForm">
													<div class="row">
														<div class="input-field col s12">
															<input id="moveAvgDays" type="number" min="0" class="validate">
															<label for="moveAvgDays">Moving Average (Trading Days)</label>
														</div>
														<div class="input-field col s12">
															<input id="compAvgDays" type="number" min="0" type="text" class="validate">
															<label for="compAvgDays">Comparison Average (Trading Days)</label>
														</div>
														<div class="container">
															<h6><b>Check Frequency</b></h6>
															<div class="input-field col s12">
																<select id="checkFreqModeSelect">
																	<option value="0">Trading Days</option>
																	<option value="1">Day of Month</option>
																	<option value="2">Day of Week</option>
																</select>
															</div>
															<div class="input-field col s12">
																<input id="checkFreq" type="text" min="0" class="validate">
																<label for="checkFreq">Check Freq Value</label>
															</div>
														</div>
														<div class="input-field col s12">
															<select id="modeSelect">
																<option value="3">Buy & Sell</option>
																<option value="1">Sell Only</option>
																<option value="2">Buy Only</option>
															</select>
														</div>
													</div>
													<div class="row center-align">
														<button class="btn-floating deleteRule" type="button">
															<i class="material-icons">delete</i>
														</button>
													</div>
												</form>`;
		investElm.find('.ruleCollection').append(ruleHtml);
		investElm.find('#modeSelect').material_select();
		investElm.find('#checkFreqModeSelect').material_select();
	};

	$(document).on('click', '.addRule', function (event) {
		var closest = $(event.target.closest('.investContainer'));
		self.addRule(closest);
	});

	$(document).on('click', '.graphInvestment', function (event) {
		var closest = $(event.target.closest('.investContainer'));
		var iCount = closest.find('#iCount').text();
		console.log('iCount: ' + iCount);
		var rules = [];
		var blp = (100 - parseInt(closest.find('#withdrawP').val())) / 100.0;
		closest.find('.ruleForm').each(function (elm) {
			var rule = {};
			rule.moveAvgDays = parseInt(closest.find('#moveAvgDays').val());
			rule.comparisonAvgDays = parseInt(closest.find('#compAvgDays').val());
			rule.checkFreq = parseInt(closest.find('#checkFreq').val());
			rule.mode = parseInt(closest.find("#modeSelect").val());
			rules.push(rule);
		});
		self.stockManager.processStock(self.symbol, rules, null, blp, (function (iCount, err, data) {
			if (err) {
				Materialize.toast(err, 4000);
			}
			var graphUnit = self.config.options.scales.xAxes[0].time.unit;
			if (data.result.length > 0 && Math.abs(data.result[0].x.diff(data.result[data.result.length - 1].x, 'year')) >= 5) {
				graphUnit = 'year';
			}
			self.config.options.scales.xAxes[0].time.unit = graphUnit;
			var found = false;
			for (var dataset of self.config.data.datasets) {
				if (dataset.iCount == iCount) {
					found = true;
					dataset.data = data.result;
					break;
				}
			}
			if (!found) {
				var colors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#00ffff", "#ff00ff", "#000000"];
				var fillColors = ['rgba(255, 0, 0, ', 'rgba(0, 255, 0, ', 'rgba(0, 0, 255, ', 'rgba(255, 255, 0, ', 'rgba(0, 255, 255, ', 'rgba(255, 0, 255, ', 'rgba(0, 0, 0, ']
				var colorI = self.config.data.datasets.length % colors.length;
				var newColor = colors[colorI];
				var fillColor = fillColors[colorI] + '0.2)';


				self.config.data.datasets.push({
					iCount: iCount,
					label: 'Inv #' + iCount,
					data: data.result,
					backgroundColor: fillColor,
					borderColor: newColor,
					borderWidth: 1
				});
			}
			self.performanceChart.update();
		}).bind(this, iCount));
	});

	$(document).on('click', '.deleteInvestment', function (event) {
		var closest = $(event.target.closest('.investContainer'));
		var iCount = closest.find('#iCount').text();
		closest.remove();
		var found = false;
		var datasets = self.config.data.datasets;
		for (var i = 0; i < datasets.length; i++) {
			if (datasets[i].iCount == iCount) {
				found = true;
				datasets.splice(i, 1);
				break;
			}
		}
		if (found) {
			self.performanceChart.update();
		}

		$('#investmentDropdown').find('.dropmember').each(function (elm) {
			if (elm.text() == iCount) {
				elm.remove();
			}
		});
	});

	$(document).on('click', '.deleteRule', function (event) {
		var closest = $(event.target.closest('.ruleForm'));
		console.log(closest.length);
		closest.remove();
	});

	$(document).on('click', '.dropmember', function (event) {
		var text = $(event.target).html();
		var iCount = text.substr(text.indexOf('#') + 1);
		$('#iCount').each(function () {
			var iCountElm = $(this);
			console.log(iCountElm.html());
			if ($(iCountElm).html() == iCount) {
				var closest = iCountElm.closest('.investContainer');
				console.log('matched');
				console.log(closest.length);
				var rules = [];
				var blp = (100 - parseInt(closest.find('#withdrawP').val())) / 100.0;
				closest.find('.ruleForm').each(function (elm) {
					var rule = {};
					rule.moveAvgDays = parseInt(closest.find('#moveAvgDays').val());
					rule.comparisonAvgDays = parseInt(closest.find('#compAvgDays').val());
					rule.checkFreq = parseInt(closest.find('#checkFreq').val());
					rule.mode = parseInt(closest.find("#modeSelect").val());
					rules.push(rule);
				});
				var inputError = self.stockManager.isValidInput(self.symbol, rules, blp);
				if (inputError != null) {
					Materialize.toast(inputError, 4000);
					return;
				}
				var params = {};
				var body = {
					symbol: self.symbol,
					numShares: 1,
					investmentDate: GetTodayStr(),
					blPrice: blp,
					rules: rules
				};
				var additionalParams = {
					headers: {
						Authorization: pm.accountManager.idToken.getJwtToken()
					}, queryParams: {}
				};
				self.apigClient.createinvestmentPost(params, body, additionalParams)
					.then(function (result) {
						window.location.href = './home.html'
					}).catch(function (err) {
						console.log("CreateInvestment Error: " + err);
					});
			}
		});
	});
	self.addInvestment();
}