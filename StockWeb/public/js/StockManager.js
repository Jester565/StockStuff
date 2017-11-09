'use strict';
var API_KEY = '1BK0ECNVZXP9IYDI';

function StockRequest(symbol) {
	var self = this;
	self.symbol = symbol;
	self.cbs = [];
	self.result = null;
	self.addCB = function (cb) {
		if (self.result != null) {
			cb(null, self.result);
		} else {
			self.cbs.push(cb);
		}
	};
	self.makeStockRequest = function () {
		$.ajax({
			url: 'https://www.alphavantage.co/query',
			type: 'get',
			data: {
				function: 'TIME_SERIES_DAILY',
				symbol: self.symbol,
				'outputsize': 'full',
				"datatype": "json",
				'apikey': API_KEY
			},
			dataType: 'json',
			success: function (response) {
				self.result = response["Time Series (Daily)"]
				for (var cb of self.cbs) {
					cb(null, self.result);
				}
			},
			error: function (xhr) {
				console.log('Get failed, trying again');
				self.makeStockRequest();
			}
		});
	};
}

function StockManager() {
	var self = this;
	self.stockRequests = {

	};
	self.getStock = function (symbol, cb) {
		var stockReq = self.stockRequests[symbol];
		if (stockReq == null) {
			stockReq = new StockRequest(symbol);
			self.stockRequests[symbol] = stockReq;
			stockReq.makeStockRequest();
		}
		stockReq.addCB(cb);
	}

	self.isValidInput = function (symbol, rules, percent) {
		for (var rule of rules) {
			if (rule.moveAvgDays <= 0 || rule.moveAvgDays >= 2000) {
				return "Moving average days must be greater than 0 and less than 2000";
			}
			if (rule.comparisonAvgDays <= 0) {
				return "Comparison Average Days must be greater than 0";
			}
			if (rule.comparisonAvgDays > rule.moveAvgDays) {
				return "Comparison Average Days must be less than Moving Average Days";
			}
			if (rule.checkFreq <= 0) {
				return "Check frequency must be greater than 0";
			}
		}
		if (percent < 0 || percent > 100) {
			return "Withdraw percent must be between 0 and 100 (inclusive)";
		}
	}

	self.processStock = function (symbol, rules, startMoment, percent, cb) {
		var inputError = self.isValidInput(symbol, rules, percent);
		if (inputError != null) {
			cb(inputError);
			return;
		}
		self.getStock(symbol, function (err, data) {
			if (err) {
				console.error("Error getting stocks " + JSON.stringify(err));
				cb(err);
				return;
			}
			//Create array to store all the stock data
			var dataPoints = [];
			var largestMoveAvgDays = 1;
			//Populate dataPoints
			$.each(data, function (index, element) {
				dataPoints.push({
					moment: moment(index), closingPrice: parseFloat(element["4. close"])
				});
			});
			console.log("DataPoints: " + dataPoints.length);
			//Initialize rules and find the greatest movingAvgDay
			for (var rule of rules) {
				if (rule.moveAvgDays > largestMoveAvgDays) {
					largestMoveAvgDays = rule.moveAvgDays;
				}
				rule.daysUntilCheck = 0;
				rule.moveAvg = 0;
				rule.compAvg = 0;
			}
			var startIndex = dataPoints.length - 1;
			//If a string date was provided, iterate over datapoints until we get to it
			if (startMoment != null) {
				for (var i = 0; i < dataPoints.length; i++) {
					var dp = dataPoints[i];
					if (dp.moment.isBefore(startMoment)) {
						startIndex = i + 1;
						break;
					}
				}
			}
			if (startIndex + largestMoveAvgDays >= dataPoints.length) {
				startIndex = dataPoints.length - largestMoveAvgDays - 1;
			}
			for (var i = 1; i <= largestMoveAvgDays; i++) {
				for (rule of rules) {
					if (rule.comparisonAvgDays < rule.checkFreq) {
						if (i < rule.comparisonAvgDays) {
							rule.compAvg += dataPoints[startIndex + i].closingPrice / rule.comparisonAvgDays;
						}
					} else if (i <= rule.comparisonAvgDays) {
						rule.compAvg += dataPoints[startIndex + i].closingPrice / rule.comparisonAvgDays;
					}
					if (i <= rule.moveAvgDays) {
						rule.moveAvg += dataPoints[startIndex + i].closingPrice / rule.moveAvgDays;
					}
				}
			}

			var result = [];
			var price = dataPoints[startIndex].closingPrice;
			var bought = false;
			if (rules.length == 0) {
				bought = true;
			}
			for (var i = startIndex; i >= 0; i--) {
				if (bought) {
					price += dataPoints[i].closingPrice - dataPoints[i + 1].closingPrice;
				} else {
					price += (dataPoints[i].closingPrice - dataPoints[i + 1].closingPrice) * percent;
				}
				if (i == startIndex || i == 0 || startIndex <= 200 || i % Math.round(startIndex / 100) == 0) {
					result.push({ x: dataPoints[i].moment, y: price });
				}
				for (rule of rules) {
					rule.moveAvg -= dataPoints[i + rule.moveAvgDays].closingPrice / rule.moveAvgDays;
					rule.moveAvg += dataPoints[i].closingPrice / rule.moveAvgDays;
					if (rule.comparisonAvgDays < rule.checkFreq) {
						if (rule.daysUntilCheck < rule.comparisonAvgDays) {
							rule.compAvg += dataPoints[i].closingPrice / rule.comparisonAvgDays;
						}
					} else {
						rule.compAvg += dataPoints[i].closingPrice / rule.comparisonAvgDays;
						rule.compAvg -= dataPoints[i + rule.comparisonAvgDays].closingPrice / rule.comparisonAvgDays;
					}
				
					if (rule.daysUntilCheck == 0) {
						if (bought) {
							if (rule.compAvg < rule.moveAvg && (rule.mode == 1 || rule.mode == 3)) {
								bought = false;
							}
						} else {
							if (rule.compAvg > rule.moveAvg && (rule.mode == 2 || rule.mode == 3)) {
								bought = true;
							}
						}
						rule.daysUntilCheck = rule.checkFreq;
						if (rule.comparisonAvgDays < rule.checkFreq) {
							rule.compAvg = 0;
						}
					}
					rule.daysUntilCheck--;
				}
			}
			cb(null, { result: result, holdPrice: dataPoints[0].closingPrice, bought: bought});
		});
	}
}
