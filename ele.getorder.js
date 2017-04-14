function loadJquery() {
	var script = document.createElement("script");
	script.setAttribute("src", "https://code.jquery.com/jquery-1.12.4.js");
	document.body.appendChild(script);
}
var Common = function () {
	var formatTimeStamp = function (timestamp) {
		if(!timestamp) return '';
		var d = new Date(timestamp),
			date = d.getDate(),
			month = d.getMonth() + 1,
			year = d.getFullYear(),
			time = d.toTimeString().substr(0, 8).replace(/:/g, '');
		return year + (month < 10 ? '0' + month : month) + (date < 10 ? '0' + date : date) + time;
	};

	return {
		formatTimeStamp: formatTimeStamp
	};
}();

var Eleme = function () {
	function random_256() {
		var _random_256 = [];
		for(var i = 0; i< 256; i++) {
			_random_256.push((i+256).toString(16).substr(1));
		}
		return _random_256;
	}

	function randomID(random_16) {
		var n = 0,
			_random_256 = random_256();
		return _random_256[random_16[n++]] + _random_256[random_16[n++]] + _random_256[random_16[n++]] + _random_256[random_16[n++]] + '-'
			+ _random_256[random_16[n++]] + _random_256[random_16[n++]] + '-'
			+ _random_256[random_16[n++]] + _random_256[random_16[n++]] + '-'
			+ _random_256[random_16[n++]] + _random_256[random_16[n++]] + '-'
			+ _random_256[random_16[n++]] + _random_256[random_16[n++]] + _random_256[random_16[n++]] + _random_256[random_16[n++]] + _random_256[random_16[n++]] + _random_256[random_16[n++]];
	}

	function createID() {
		var uint_16_arr = new Uint8Array(16),
			random_16 = window.crypto.getRandomValues(uint_16_arr);
		random_16[6] = 15 & random_16[6] | 64;
		random_16[8] = 63 & random_16[8] | 128;
		return randomID(random_16);
	}
	var orderInfo = function ($target, order) {
		var scope = (typeof angular != 'undefined') ? angular.element($target).scope() : null,
			originalOrder = scope ? scope.order : order,
			userNameSex = originalOrder.consigneeName.split(' '),
			userSex = userNameSex[1] || '',
			orderSubmitTime = originalOrder.activeTime && originalOrder.activeTime.replace(/[T:\-]/g, ''),
			bookedTime = originalOrder.bookedTime && originalOrder.bookedTime.replace(/[T:\-]/g, '') ,
			orderGroup = _.groupBy(originalOrder.groups, 'type'),
			foodGroup = orderGroup.normal || orderGroup.NORMAL || [],
			extraGroup = orderGroup.extra || orderGroup.EXTRA || [],
			goodsCount = (_.result(originalOrder, 'goodsSummary', '').match(/\d+/g) || ['0'])[0],
			orderDayNo = parseFloat(originalOrder.daySn) < 10 ? '0' + originalOrder.daySn : originalOrder.daySn + '',
			deliverAmount = originalOrder.deliveryFee || originalOrder.deliveryFeeTotal || originalOrder.deliveryCost || _.result(_.find(_.result(extraGroup[0], 'items', []), {name: '配送费'}), 'price', 0),
			orderFreeTotal = originalOrder.goodsTotal - originalOrder.payAmount + deliverAmount,
			isOrderPaid = originalOrder.paymentStatus == 'success' || originalOrder.paymentStatus == 'SUCCESS',discountGroup = orderGroup.discount || orderGroup.DISCOUNT || [],
			sendGroup = _.find(discountGroup, {name: '赠品'}),
			foodLst = $.map(foodGroup.concat(sendGroup || []), function(group) {
				return $.map(group.items, function (item) {
					var nameUnit = item.name.split('-'),
						nameRemark = nameUnit[0].split('['),
						foodName = nameRemark[0],
						unitRemark = (nameUnit[1] || '').split('['),
						fUnit = unitRemark[0]  || '份',
						foodRemark = (unitRemark[1] || nameRemark[1] || '').replace(/[\[\]]/g, '').replace(/\+/g, ',');
					foodName = foodName.replace(/【抢】\s*/g, '');
					return {foodName: foodName, unit: fUnit, price: item.price.toString(), number: item.quantity.toString(), remark: foodRemark};
				});
			}).reduce(function(a, b) {return a.concat(b)}, []),
			foodAmount = $.map(foodLst, function(food) {return parseFloat(food.price)*parseFloat(food.number);})
				.reduce(function(a, b) {return a + b;});
		return {
			channelName: '饿了么',
			channelOrderNo: orderSubmitTime.substr(0, 8) + '-' + orderDayNo,
			channelOrderKey: originalOrder.id + '',
			userName: userNameSex[0] || '',
			userSex: userSex.indexOf('女士') != -1 ? '0' : userSex.indexOf('先生') != -1 ? '1' : '2',
			userMobile: originalOrder.consigneePhones.join(','),
			userAddress: originalOrder.consigneeAddress,
			userAddressDistance: originalOrder.distance,
			orderRemark: originalOrder.remark,
			foodCount: goodsCount.toString(),
			foodBoxCount: '1',
			foodAmount: foodAmount.toFixed(2),
			foodBoxAmount: originalOrder.packageFee.toFixed(2),
			deliveryAmount: deliverAmount.toFixed(2),
			orderFreeAmount: orderFreeTotal.toFixed(2),
			orderPromotionDesc: '',
			orderTotalAmount: originalOrder.goodsTotal.toFixed(2),
			orderReceivableAmount: (originalOrder.goodsTotal - orderFreeTotal).toFixed(2),
			orderSubmitTime: orderSubmitTime,
			orderDeliveryTime: bookedTime || orderSubmitTime || '',
			bookedTime: bookedTime || '',
			payStatus: isOrderPaid ? '1' : '0',
			paidRealAmount: isOrderPaid ? originalOrder.payAmount.toFixed(2) : '0',
			shopRealAmount: originalOrder.income.toFixed(2),
			invoiceTitle: originalOrder.invoiced ? originalOrder.invoiceTitle : '',
			invoiceAmount: originalOrder.invoiced ? originalOrder.receivable.toFixed(2) : '',
			foodLst: foodLst
		};
	};
	function getOrderDetail(target) {
		var orderId_1 = ($(target).parents('.card').find('.meta-data .ul-reset li:last').text().match(/\d+/g) || [])[0],
		    orderId_2 = ($(target).parents('.card-footer').find('.color-black-assist p:last').text().match(/\d+/g) || [])[0],
		    orderId = orderId_1 || orderId_2,
			id = createID();
		if(orderId) {
			$.ajax({
				timeout: '2500',
				url: 'https://app-api.shop.ele.me/nevermore/invoke/',
				type: 'post',
				contentType: 'application/json; charset=UTF-8',
				data: JSON.stringify({
					id: id,
					method: "getOrderDetail",
					service: "OrderService",
					params: {orderId: orderId},
					metas: {appName: "melody", appVersion: "4.4.0", ksid: localStorage.ksid},
					ncp: "2.0.0"
				}),
				success: function (data) {
					if (data.error) {
						console.log(data.error);
						return;
					}
					alert(JSON.stringify(orderInfo(null, data.result)));
				},
				error: function (data) {
					console.log('saas获取订单信息失败！', data);
				}
			})
		}
	}
	return {
		getOrder: orderInfo,
		getOrderDetail: getOrderDetail
	};
}();
//if(typeof $ == undefined) loadJquery();
$(document).off('click', '.card-order [ng-click^="print"]').on('click', '.card-order [ng-click^="print"]', function (e) {
	alert(JSON.stringify(Eleme.getOrder($(e.target))));
});
$(document).off('click', '.card .card-footer .buttons .left .btn-default').on('click', '.card .card-footer .buttons .left .btn-default', function(e) {
	var $target = $(e.target);
	if($target.text().indexOf('打印订单') == -1) return;
	Eleme.getOrderDetail(e.target);
});
$(document).off('click', '.order-query .order-list .order-card .card-footer .order-btn').on('click', '.order-query .order-list .order-card .card-footer .order-btn', function(e) {
	var $tar = $(e.target);
	if($tar.text().indexOf('打印订单') == -1) return;
	Eleme.getOrderDetail(e.target);
});
setTimeout(function() {
    if (wmSystemApi.EleAutoPrint())
    {
            console.log("log", "执行自动打印");
            var itemLst = $("p:contains(单号)");
            var btnLst = $("button:contains(打印订单)");
            for (i = 0; i<itemLst.length; i++)
            {
                var orderID = itemLst[i].innerText;
                if (wmSystemApi.NeedPrint(orderID))
                {
                    btnLst[i].click();
                }
            }
            wmSystemApi.EleAutoPrintEnd();
    }
}, 3000);
