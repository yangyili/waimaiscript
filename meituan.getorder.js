//  version 1.0
var Common = function (window, $) {
    var formatTimeStamp = function (timestamp) {
        if(!timestamp) return '';
        var d = new Date(timestamp),
            date = d.getDate(),
            month = d.getMonth() + 1,
            year = d.getFullYear(),
            time = d.toTimeString().substr(0, 8).replace(/:/g, '');
        return year + '' + (month < 10 ? '0' + month : month) + '' + (date < 10 ? '0' + date : date) + time;
    };

    return {
        formatTimeStamp: formatTimeStamp
    };
}(window, jQuery);

var Meituan = (function (window, jQuery) {
    var orderInfo = function ($target) {
        var $order = $target.parents('.order'),
            wmOrderId = $order.data('orderId'),
            wmPoiId = $order.data('poiId'),
            wmViewId = $order.data('viewId'),
            distance = $order.find('.user-info').find('.user-location .j-address i').text();
        var serviceAmount = 0,
            shopRealAmount = 0;
        var getOrderSuccess = function(data) {
            if(data.code == 0) {
                var order = data.data[0],
                    userSex = ((order.recipient_name || '').match(/[\(（][\u4e00-\u9fa5]+[\)）]/g) || [''])[0],
                    orderTime = (order.order_time_fmt || '').replace(/[-:\s]/g, '') || Common.formatTimeStamp(order.order_time*1000),
                    deliverBookTime = order.delivery_btime_fmt ? order.delivery_btime_fmt.replace(/[-:\s]/g, '') : orderTime,
                    //服务费用使用折扣前的金额计算
                    foodAmount = _.map(order.cartDetailVos, function(cart) {return cart.cartAmount}).reduce(function(amount1, amount2){return amount1 + amount2;}, 0),
                    foodBoxCount = 0,
                    sendFoods = _.where(order.discounts, {category: 0}),
                    foodLst = _.flatten(_.map(order.cartDetailVos, function(cart) {
                        return _.map(cart.details, function(food) {
                            var remark = (food.food_name || '').match(/([\(（]*[\u4e00-\u9fa5\w!@#$%^&*+=-_'":;,：.；’“<>《》、【】？\?\|\[\]\{\}\\]+[\)）]+)|([\(（]+[\u4e00-\u9fa5\w!@#$%^&*+=-_'":;,：.；’“<>《》、？【】\?\|\[\]\{\}\\]+[\)\）]*)/g) || [],
                                name = (((food.food_name || '').match(/^[\u4e00-\u9fa5\w!@#$%^&*+=-_'":;,：.；’“<>《》{}、【】？\?\|\[\]\\\s]+[\(（]?/g)) ||
                                    (food.food_name || '').match(/[\)）][\u4e00-\u9fa5\w!@#$%^&*+=-_'":;,：.；’“<>《》{}、【】？\?\|\[\]\\\s]+(?![\)）])+/g)
                                )[0].replace(/[\(（\)）]*/g, '');
                            return {
                                foodName: $.trim(name),
                                price: (food.origin_food_price || 0).toFixed(2),
                                unit: food.unit || '',
                                number: (food.count || 0).toString(),
                                remark: remark.join(';').replace(/[\(（）\)]*/g, '')
                            };
                        });
                    }));
                _.each(order.cartDetailVos, function(cart) {
                    var detailBoxCount = 0;
                    _.each(cart.details, function (food) {
                        detailBoxCount += food.box_num || 0;
                    });
                    foodBoxCount += detailBoxCount;
                });
                var saasOrder = {
                        channelName: '美团外卖',
                        channelOrderNo: orderTime.substr(0, 8) + '-' + (order.wm_poi_order_dayseq < 10 ? '0' : '') + order.wm_poi_order_dayseq,
                        channelOrderKey: order.wm_order_id_view_str,
                        userName: ((order.recipient_name || '').match(/^[\u4e00-\u9fa5\d\w!@#$%^&*_+-=~·;'\[\],./\\，。、、；‘【】《》？：“{}\|<>?:"{}]*[\(（]?/g) || [''])[0].replace(/[\(（]/g, ''),
                        userSex: !userSex ? '2' : userSex.indexOf('女士') != -1 ? '0' : userSex.indexOf('先生') != -1 ? '1' : '2',
                        userMobile: order.recipient_phone,
                        userAddress: order.recipient_address,
                        userAddressDistance: distance,
                        orderRemark: order.remark,
                        foodCount: order.total_items.toString(),
                        foodBoxCount: (foodBoxCount + '') || '0',
                        foodAmount: (foodAmount || 0).toFixed(2),
                        foodBoxAmount: (order.boxpriceTotal || 0).toFixed(2),
                        deliveryAmount: (order.shipping_fee || 0).toFixed(2),
                        orderTotalAmount: (order.total_before || 0).toFixed(2),
                        orderFreeAmount: ((order.total_before - order.total_after) || 0).toFixed(2),
                        orderPromotionDesc: _.pluck(sendFoods, 'type').join(','),
                        orderReceivableAmount: (order.total_after || 0).toFixed(2),
                        orderSubmitTime: orderTime,
                        orderDeliveryTime: deliverBookTime,
                        payStatus: order.wm_order_pay_type == 2 ? '1' : '0',
                        paidRealAmount: order.wm_order_pay_type == 2 ? order.total_after.toFixed(2) : '0',
                        invoiceTitle: order.invoice_title || '',
                        invoiceAmount: order.invoice_title ? (order.total_after || 0).toFixed(2) : '0',
                        shopRealAmount: shopRealAmount + '',
                        foodLst: foodLst
                    };
                alert(JSON.stringify(saasOrder));
            }
        };
        $.ajax({
            type: 'post',
            url: '/v2/order/receive/r/chargeInfo',
            data: {chargeInfo: JSON.stringify([{
                wmOrderViewId: wmViewId,
                wmPoiId: wmPoiId
            }])},
            success: function(data) {
                if(data.code != '0') {
                    return;
                }
                var curOrderChargeInfo = data.data[0];
                serviceAmount = curOrderChargeInfo.commisionAmount;
                shopRealAmount = curOrderChargeInfo.settleAmount;
                $.ajax({
                    type: 'post',
                    url: '/v2/order/history/r/print/info',
                    data: {
                        wmOrderId: wmOrderId,
                        wmPoiId: wmPoiId
                    },
                    success: function(data) {
                        getOrderSuccess(data);
                    }
                });
            }
        });
    };
    var addCookieDeviceId = function() {
        var getDeviceIdUrl = '/api/poi/r/deviceUuid';
        $.post(getDeviceIdUrl, {appVersion: '32'}, function(data) {
            if(data.code == '0') {
                var deviceid = data.data;
                document.cookie = 'device_uuid=' + deviceid;
            }
        })
    };

    return {
        getOrder: orderInfo,
        addCookieDeviceId: addCookieDeviceId
    };
})(window, jQuery);

$(document).ready(function() {
    $(document).undelegate('.J-print-order', 'click').delegate('.J-print-order', 'click', function (e) {
        Meituan.getOrder($(e.target));
    });
    var path = document.location.pathname;
    if(path.indexOf('logon') != -1) {
        Meituan.addCookieDeviceId();
    }
});