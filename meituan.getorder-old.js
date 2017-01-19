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
            distance = $order.find('.user-info').find('.user-location .j-address i').text();
        var serviceRate = 0,
            promotionLst = [],
            isThirdShipping = '0',
            isPreferForBox = '1',
            isShopDiscountToService = '1',
            isShippingFeeToService = '1';
        try {
            serviceRate = parseFloat(wmSystemApi.getServiceRate());
            var promotionParams = JSON.parse(wmSystemApi.getPromotionList());
            promotionLst = promotionParams.shopPromotion || [];
            isThirdShipping = JSON.parse(wmSystemApi.isThirdShipping()) == 1;
            isPreferForBox = JSON.parse(wmSystemApi.isPreferForBox()) == 1;
            isShopDiscountToService = JSON.parse(wmSystemApi.isShopDiscountToService()) == 1,
            isShippingFeeToService = JSON.parse(wmSystemApi.isShippingFeeToService()) == 1;
        } catch(data) {
            console.log('获取费率失败！');
            console.log(data)
        }
        $.ajax({
            type: 'post',
            url: '/v2/order/history/r/print/info',
            data: {
                wmOrderId: wmOrderId,
                wmPoiId: wmPoiId
            },
            success: function(data) {
                if(data.code == 0) {
                    //  商家需要承担的服务费 = (菜品总金额 + 商家收取的配送费 - 商家承担的优惠活动)
                    /* 商家设置的活动列表：
                    * {
                    *   'shopPromotion' : [
                    *       {
                    *           'promotionName': '' //对应discounts里的type
                    *           'shopAccept': '',
                    *           'platformAccept': ''
                    *       }
                    *   ]
                    * }
                    *
                    * */
                    var order = data.data[0],
                        userSex = ((order.recipient_name || '').match(/[\(（][\u4e00-\u9fa5]+[\)）]/g) || [''])[0],
                        orderTime = (order.order_time_fmt || '').replace(/[-:\s]/g, '') || Common.formatTimeStamp(order.order_time*1000),
                        deliverBookTime = order.delivery_btime_fmt ? order.delivery_btime_fmt.replace(/[-:\s]/g, '') : orderTime,
                        //服务费用使用折扣前的金额计算
                        foodOriginAmount = $.map(order.details, function(detail) {return detail.origin_food_price*detail.count}).reduce(function(amount1, amount2){return amount1 + amount2;}, 0),
                        foodAmount = $.map(order.cartDetailVos, function(cart) {return cart.cartAmount}).reduce(function(amount1, amount2){return amount1 + amount2;}, 0),
                        sendFoods = _.where(order.discounts, {category: 0}),
                        discounts =_.map(order.discounts, function(dis) {
                            var disInPromotion = _.find(promotionLst, function (p) {
                                return p.promotionName == dis.type;
                            });
                            return _.extend({}, {platformAccept: disInPromotion ? disInPromotion.platformAccept || '0' : dis.info, shopAccept: disInPromotion ? disInPromotion.shopAccept || '0' : '0'});
                        }),
                        thirdPartDiscounts = _.pluck(discounts, 'platformAccept'),
                        shopDiscounts = _.pluck(discounts, 'shopAccept'),
                        thirdPartDiscountAmount = thirdPartDiscounts.length > 0 ? thirdPartDiscounts.reduce(function(sum, platformAMount) { return sum + Math.abs(parseFloat(platformAMount || '0'));}, 0) : 0,
                        shopDiscountAmount = shopDiscounts.length > 0 ? shopDiscounts.reduce(function(sum, shopAmount) { return sum + Math.abs(parseFloat(shopAmount || '0'));}, 0) : 0,
                        serviceAmount = (foodOriginAmount + (isPreferForBox ? (order.boxpriceTotal || 0) : 0)
                            + (isShippingFeeToService ? (isThirdShipping ? 0 : (order.shipping_fee || 0)) : 0)
                            - (isShopDiscountToService ? shopDiscountAmount : 0)) * serviceRate,
                        thirdShippingFee = isThirdShipping ? (order.shippingFee > 0 ? order.shippingFee : (order.shipping_fee || 0)) : 0,
                        shopRealAmount = (order.total_after || 0) + parseFloat(thirdPartDiscountAmount) - serviceAmount - thirdShippingFee,
                        saasOrder = {
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
                            foodBoxCount: order.details.reduce(function(sum, food) { return sum + parseFloat(food.box_num || '0'); }, 0).toFixed(2),
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
                            shopRealAmount: typeof shopRealAmount == 'number' ? shopRealAmount.toFixed(2) : '0',
                            foodLst: $.map(order.details, function(food) {
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
                            })
                        };
                    alert(JSON.stringify(saasOrder));
                }
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