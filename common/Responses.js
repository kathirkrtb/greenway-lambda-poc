const Responses = {
    _DefineResponse(statusCode = 502, data = {}) {
        return {
            headers: {
                'Access-Control-Allow-Origin': '*',
                "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key"                
            },
            statusCode,
            body: JSON.stringify(data),
        };
    },

    _200(data = {}) {
        return this._DefineResponse(200, data);
    },

    _500(data = {}) {
        return this._DefineResponse(500, data);
    },

    _204(data = {}) {
        return this._DefineResponse(204, data);
    },

    _400(data = {}) {
        return this._DefineResponse(400, data);
    },
    _422(data = {}) {
        return this._DefineResponse(422, data);
    },
    _404(data = {}) {
        return this._DefineResponse(404, data);
    },
};

module.exports = Responses;