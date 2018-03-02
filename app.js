const Koa = require('koa')

const logger = require('koa-logger')
const bodyParser = require('koa-bodyparser')
const xmlParser = require('koa-xml-body')

const wechat = require('./controllers/wechat')

const config = require('./config')

const app = new Koa()

wechat.init()


app
    .use(logger())
    .use(xmlParser())
    .use(bodyParser())

app.use(wechat.main)

// 默认端口80
const port = config.server.port
app.listen(port, () => {
    console.log(`>>> server is starting at port ${port}`)
})
