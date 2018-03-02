const xml2js = require('xml2js')

exports.jsonToXml = (obj) => {
    const builder = new xml2js.Builder()
    return builder.buildObject(obj)
}