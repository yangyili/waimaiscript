(function() {
    var printSet = {
        "single": {
            "number": 1,
            "customer": 1,
            "delivery": 0,
            "chef": 0,
            "supermarket": 0,
            "driver": "test print",
            "keep": 1,
            "font": 2,
            "width": 58,
            "enable": 1
        },
        "multi": {
            "drivers": {},
            "enable": 0
        },
        "nodriver": {
            "printers": {},
            "enable": 0
        }
    };
    try {
        crm && crm.util && crm.util.storage && crm.util.storage.set && crm.util.storage.set('print', printSet)
    } catch (data) {
        console.log(data, 'crm is undefined!');
    }
})();