'use strict';
var API_KEY = '1BK0ECNVZXP9IYDI';

//Mozilla Decimal Rounding
function decimalAdjust(type, value, exp) {
	// If the exp is undefined or zero...
	if (typeof exp === 'undefined' || +exp === 0) {
		return Math[type](value);
	}
	value = +value;
	exp = +exp;
	// If the value is not a number or the exp is not an integer...
	if (value === null || isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
		return NaN;
	}
	// If the value is negative...
	if (value < 0) {
		return -decimalAdjust(type, -value, exp);
	}
	// Shift
	value = value.toString().split('e');
	value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
	// Shift back
	value = value.toString().split('e');
	return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
}

// Decimal round
if (!Math.round10) {
	Math.round10 = function (value, exp) {
		return decimalAdjust('round', value, exp);
	};
}

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
			//It is hard to explain why this is set to 1
			var largestMoveAvgDays = 1;
			//Populate dataPoints
			$.each(data, function (index, element) {
				dataPoints.push({
					moment: moment(index), closingPrice: parseFloat(element["4. close"])
				});
			});
			var startIndex = dataPoints.length - 1;
			//If a string date was provided, iterate over datapoints until we get to it
			if (startMoment != null) {
				for (var i = 0; i < dataPoints.length; i++) {
					var dp = dataPoints[i];
					if (dp.moment.isBefore(startMoment)) {
						startIndex = i - 1;
						break;
					}
				}
			}
			//Iterate over rules to find the maximum numbers of days we will have to go back in order to calculate averages
			for (var rule of rules) {
				if (rule.checkFreqMode == 1) {
					//There is a maximum of 23 weekdays in a month  (There is probably a better way of doing this)
					rule.moveAvgDays += 23;
				} else if (rule.checkFreqMode == 2) {
					//There is a maximum of 5 weekdays in a week  (There is probably a better way of doing this)
					rule.moveAvgDays += 5;
				}
				if (rule.moveAvgDays > largestMoveAvgDays) {
					largestMoveAvgDays = rule.moveAvgDays;
				}
				rule.daysUntilCheck = 0;
				rule.moveAvg = 0;
				rule.compAvg = 0;
			}

			//If we are going back to before our data, shift the startIndex over to the closest we can get all the info we need for averages
			if (startIndex + largestMoveAvgDays > dataPoints.length) {
				startIndex = dataPoints.length - largestMoveAvgDays;
			}

			//TODO: If startIndex is less than 0, then we need to give some kind of failure message

			for (var i = 0; i < largestMoveAvgDays; i++) {
				for (var rule of rules) {
					if (rule.checkFreqMode != 0) {
						if (rule.iOff == null) {
							if (

								(rule.checkFreqMode == 1 && rule.checkFreq <= dataPoints[startIndex].moment.date() &&
									(dataPoints[startIndex].moment.month() != dataPoints[startIndex + 1].moment.month() || rule.checkFreq > dataPoints[startIndex + 1].moment.date())) ||

								(rule.checkFreqMode == 2 && rule.checkFreq <= dataPoints[startIndex].moment.isoWeekday() &&
									(dataPoints[startIndex].moment.isoWeek() != dataPoints[startIndex + 1].moment.isoWeek() || rule.checkFreq > dataPoints[startIndex + 1].moment.isoWeekday()))) {

								rule.iOff = i;
								rule.offMoveAvg = 0;
								rule.offCompAvg = 0;
							}
						}
						if (rule.iOff != null) {
							if (i - rule.iOff < rule.comparisonAvgDays) {
								rule.offCompAvg += dataPoints[startIndex + i].closingPrice / rule.comparisonAvgDays;
							}
							if (i - rule.iOff < rule.moveAvgDays) {
								rule.offMoveAvg += dataPoints[startIndex + i].closingPrice / rule.moveAvgDays;
							}
						}
					} else {
						if (i < rule.comparisonAvgDays) {
							rule.compAvg += dataPoints[startIndex + i].closingPrice / rule.comparisonAvgDays;
						}
						if (i < rule.moveAvgDays) {
							rule.moveAvg += dataPoints[startIndex + i].closingPrice / rule.moveAvgDays;
						}
					}
				}
			}

			var result = [];
			var bought = false;
			var price = dataPoints[startIndex].closingPrice;
			result.push({ x: dataPoints[startIndex].moment, y: Math.round10(price, -2) });

			//TODO: Bought should smarter, if there are no rules of type 3 or 2, bought = true... (or maybe this should be customizable?)
			if (rules.length == 0) {
				bought = true;
			}

			//Initializes the bought value
			//TODO: Fix the priority of these rules (for example, unless nonzero checkFreqModes have an iOff of 0, their priority should always be less)
			for (var rule of rules) {
				if (bought) {
					if (rule.compAvg < rule.moveAvg && (rule.mode == 1 || rule.mode == 3)) {
						bought = false;
					}
				} else {
					if (rule.compAvg > rule.moveAvg && (rule.mode == 2 || rule.mode == 3)) {
						bought = true;
					}
				}
				rule.daysUntilCheck = rule.checkFreq - 1;
			}

			for (var i = startIndex - 1; i >= 0; i--) {
				if (bought) {
					price += dataPoints[i].closingPrice - dataPoints[i + 1].closingPrice;
				} else {
					price += (dataPoints[i].closingPrice - dataPoints[i + 1].closingPrice) * percent;
				}
				if (i == 0 || startIndex <= 200 || i % Math.round(startIndex / 100) == 0) {
					result.push({ x: dataPoints[i].moment, y: Math.round10(price, -2) });
				}
				for (rule of rules) {
					rule.moveAvg -= dataPoints[i + rule.moveAvgDays].closingPrice / rule.moveAvgDays;
					rule.moveAvg += dataPoints[i].closingPrice / rule.moveAvgDays;
					rule.compAvg -= dataPoints[i + rule.comparisonAvgDays].closingPrice / rule.comparisonAvgDays;
					rule.compAvg += dataPoints[i].closingPrice / rule.comparisonAvgDays;

					if (
						(rule.checkFreqMode == 0 && rule.daysUntilCheck == 0) ||

						(rule.checkFreqMode == 1 && rule.checkFreq <= dataPoints[i].moment.date() &&
							(dataPoints[i].moment.month() != dataPoints[i + 1].moment.month() || rule.checkFreq > dataPoints[i + 1].moment.date())) ||

						(rule.checkFreqMode == 2 && rule.checkFreq <= dataPoints[i].moment.isoWeekday() &&
							(dataPoints[i].moment.isoWeek() != dataPoints[i + 1].moment.isoWeek() || rule.checkFreq > dataPoints[i + 1].moment.isoWeekday()))) {
						{
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
						}
						//This only effects checkMode=0
						rule.daysUntilCheck--;
					}
				}
			}
			cb(null, { result: result, holdPrice: dataPoints[0].closingPrice, bought: bought});
		});
	}
}
