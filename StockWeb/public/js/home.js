'use strict';

function init(loggedIn) {
	if (!loggedIn) {
		//window.location.href = './signin.html';
		return;
	}
	var hm = new HomeManager();
}

pm.addCB(init);

function HomeManager() {
	var self = this;

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

	self.stockManager = new StockManager();

	self.apigClient = apigClientFactory.newClient();

	var params = {};
	var body = {};
	console.log('IDToken: ' + pm.accountManager.idToken.getJwtToken());
	var additionalParams = {
		headers: {
			Authorization: pm.accountManager.idToken.getJwtToken()
		},
		queryParams: {}
	};
	self.apigClient.getinvestmentsGet(params, body, additionalParams)
		.then(function (result) {
			self.investments = result.data.investments;
			if (self.investments.length == 0) {
				$('#noInvestmentsContent').show();
			} else {
				$('#performanceContent').show();
			}
			for (var investment of self.investments) {
				console.log(JSON.stringify(investment));
				var symbol = investment.symbol;
				var html = `<li class="investment"><p class="title"><b>${symbol}</b></p>
					<div class="progress">
					 <div class="indeterminate"></div>
					</div>
					<a class="secondary-content btn editInvestment"><i class="material-icons">mode_edit</i></a>
					</li>`;
				$("#investmentCollection").append(html);
				self.stockManager.processStock(symbol, investment.rules, moment(investment.investmentDate), investment.blPrice, (function (symbol, err, data) {
					var infoHtml = `<p>
						Your Plan: $${data.result[data.result.length - 1].y} <br>
						Price: $${data.holdPrice} <br>
						Bought: ${data.bought}
					</p>`;

					$('.investment').each(function () {
						var elm = $(this);
						var elmSymbol = elm.find('.title').text();
						if (elmSymbol == symbol) {
							elm.find('.progress').remove();
							elm.append(infoHtml);
						}
					});

					var graphUnit = self.config.options.scales.xAxes[0].time.unit;
					if (data.result.length > 0 && Math.abs(data.result[0].x.diff(data.result[data.result.length - 1].x, 'year')) >= 5) {
						graphUnit = 'year';
					}
					self.config.options.scales.xAxes[0].time.unit = graphUnit;
					var colors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#00ffff", "#ff00ff", "#000000"];
					var fillColors = ['rgba(255, 0, 0, ', 'rgba(0, 255, 0, ', 'rgba(0, 0, 255, ', 'rgba(255, 255, 0, ', 'rgba(0, 255, 255, ', 'rgba(255, 0, 255, ', 'rgba(0, 0, 0, ']
					var colorI = self.config.data.datasets.length % colors.length;
					var newColor = colors[colorI];
					var fillColor = fillColors[colorI] + '0.2)';

					self.config.data.datasets.push({
						label: symbol,
						data: data.result,
						backgroundColor: fillColor,
						borderColor: newColor,
						borderWidth: 1
					});
					self.performanceChart.update();
				}).bind(this, symbol));
			}
		}).catch(function (err) {
			console.log("GetInvestment Error: " + err);
		});

	$(document).on('click', '.editInvestment', function (event) {
		var closest = $($(event.target).closest('.investment'));
		var symbol = closest.find('.title').text();
		self.modalSymbol = symbol;
		for (var investment of self.investments) {
			if (investment.symbol == self.modalSymbol) {
				$('#symbolModalForm').text(self.modalSymbol);
				$('#holdPercentModalForm').text(100 - Math.round(investment.blPrice * 100));
				$('#emailSwitch').prop('checked', investment.emailEnabled);
				for (var rule of investment.rules) {
					var modeText = 'Buy & Sell';
					if (rule.mode == 1) {
						modeText = 'Sell Only';
					} else if (rule.mode == 2) {
						modeText = 'Buy Only';
					}
					var html = `<li>
					<p>Moving Average Days: ${rule.moveAvgDays}</p>
					<p>Comparison Average Days: ${rule.comparisonAvgDays}</p>
					<p>Check Frequency: ${rule.checkFreq}</p>
					<p>${modeText}</p></li><hr/>`;
					$('#rulesListModalForm').empty();
					$('#rulesListModalForm').append(html);
				}
				$('#editmodal').modal('open');
				break;
			}
		}
	});

	$('#saveModalForm').click(function () {
		$('#emailSwitch').prop('checked');
		for (var investment of self.investments) {
			if (investment.symbol == self.modalSymbol) {
				if ($('#emailSwitch').prop('checked') != investment.emailEnabled) {
					var params = {};
					var body = {
						symbol: self.modalSymbol,
						enabled: $('#emailSwitch').prop('checked')
					};
					var additionalParams = {
						headers: {
							Authorization: pm.accountManager.idToken.getJwtToken()
						},
						queryParams: {}
					};
					self.apigClient.setinvestmentemailPost(params, body, additionalParams)
						.then(function (result) {
							investment.emailEnabled = $('#emailSwitch').prop('checked');
							$('#editmodal').modal('close');
						}).catch(function (err) {
							console.log("Unsub Err: " + err);
						});
				}
				break;
			}
		}
	});

	$(document).on('click', '.deleteInvestment', function (event) {
		var symbol = self.modalSymbol;
		var params = {};
		var body = {
			symbol: symbol
		};
		var additionalParams = {
			headers: {
				Authorization: pm.accountManager.idToken.getJwtToken()
			},
			queryParams: {}
		};
		self.apigClient.deleteinvestmentPost(params, body, additionalParams)
			.then((function (closest, result) {
				$('.investment').each(function () {
					var elm = $(this);
					var elmSymbol = elm.find('.title').text();
					if (elmSymbol == symbol) {
						elm.remove();
						var datasets = self.config.data.datasets;
						for (var i = 0; i < datasets.length; i++) {
							if (datasets[i].label == self.modalSymbol) {
								datasets.splice(i, 1);
								self.performanceChart.update();
								break;
							}
						}
						$('#editmodal').modal('close');
					}
				});
			}).bind(this)).catch(function (err) {
				console.log("DeleteInvestment Error: " + err);
			});
	});

	$('#invest').click(function () {
		window.location.href = './invest.html?symbol=' + $('#symbol').val();
	});
}