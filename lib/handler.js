var util = require("util");

function set_error(m, id, code, message) {
    if (m.addHeader)
        m.response.addHeader("Content-Type", "application/json");

    m.response.write(JSON.stringify({
        id: id,
        error: {
            code: code,
            message: message
        }
    }));
}

function handler(func) {
    function invoke(m, o) {
        var method = o.method;

        if (!method)
            return {
                id: o.id,
                error: {
                    code: -32603,
                    message: "method is missing."
                }
            };

        var params = o.params;

        if (params === undefined)
            params = [];

        if (!Array.isArray(params))
            return {
                id: o.id,
                error: {
                    code: -32603,
                    message: "Invalid params."
                }
            };

        var f;
        if (!util.isFunction(func)) {
            f = func[method];
            if (!f)
                return {
                    id: o.id,
                    error: {
                        code: -32601,
                        message: "Method not found."
                    }
                };
        } else
            f = func;

        var r;
        try {
            r = f.apply(m, params);
        } catch (e) {
            console.error(e.stack);
            return {
                id: o.id,
                error: {
                    code: -32603,
                    message: "Internal error."
                }
            };
        }

        return {
            id: o.id,
            result: r
        };
    }

    return function(m) {
        if (m.firstHeader) {
            var ct = m.firstHeader("Content-Type");
            if (!ct)
                return set_error(m, -1, -32603, "Content-Type is missing.");

            ct = ct.split(",")[0];
            if (ct !== "application/json")
                return set_error(m, -1, -32603, "Invalid Content-Type.");
        }

        var d = m.data;

        if (Buffer.isBuffer(d))
            d = d.toString();

        if (!d)
            return set_error(m, -1, -32603, "request body is empty.");

        var o = JSON.parse(d);
        var r = invoke(m, o);

        if (m.addHeader)
            m.response.addHeader("Content-Type", "application/json");

        m.response.write(JSON.stringify(r));
    };
}

module.exports = handler;