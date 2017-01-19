var ElemCommon = (function () {
    var jumpToJiedan = function () {
        var trait = JSON.parse(localStorage.npa_user_traits),
            rid = trait && trait.rid;
        //location.pathname = "/eleme/napos.picto.melody/app/shop/" + rid + "/order/processing";
        $('navitem[ui-sref="app.shop.order.querying"]').trigger('click');
    };
    var hasNewOrders = function () {
        var cards = document.querySelectorAll('.order-list .card');
        alert('hasNewOrders:' + cards.length);
    };
    return {
        toJiedan: jumpToJiedan,
        hasNewOrders: hasNewOrders
    }
})();