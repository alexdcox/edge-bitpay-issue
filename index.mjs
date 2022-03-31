import qrcode from 'qrcode-terminal'
import http from 'http'
import fs from 'fs'

const config = JSON.parse(fs.readFileSync('config.json'))
const {lanIpAddress, litecoinAddress: address} = config
const paymentId = 'testPayment0001'
const paymentUrl = `http://${lanIpAddress}:8080/i/${paymentId}`
const port = 8080
const sendAmount = 1e4
const memo = 'Test Memo'
const litecoinPaymentUrl = `litecoin:?r=${paymentUrl}`

const respond = data => {
  const responseJson = JSON.stringify(data, null, 4)
  console.log('<--', responseJson)
  return responseJson
}

const handleUnknownRequest = (req, res) => {
  console.log('UNHANDLED REQUEST')
  console.log(req.headers)
  console.log(`${req.method} ${req.url}`)
  res.writeHead(200)
  res.end()
}

const handleV2PaymentOptions = (req, res) => {
  res.setHeader("Content-Type", "application/payment-options")
  res.writeHead(200)
  const expires = new Date()
  expires.setHours((new Date()).getHours() + 1)
  const data = {
    time: new Date(),
    expires,
    memo,
    paymentUrl,
    paymentId,
    paymentOptions: [{
      chain: 'LTC',
      currency: 'LTC',
      network: 'main',
      estimatedAmount: sendAmount,
      requiredFeeRate: 10,
      minerFee: 0,
      decimals: 8,
      selected: true
    }],
  }
  res.end(respond(data));
}

const handleV2PaymentRequest = (req, res, postData) => {
  res.setHeader("Content-Type", "application/payment-request")
  res.writeHead(200)
  const expires = new Date()
  expires.setHours((new Date()).getHours() + 1)
  const data = {
    time: new Date(),
    expires,
    memo,
    paymentUrl,
    paymentId,
    chain: 'LTC',
    currency: 'LTC',
    network: 'main',
    instructions: [{
      type: 'transaction',
      requiredFeeRate: 10,
      outputs: [{
        amount: sendAmount,
        address,
      }]
    }],
  }
  res.end(respond(data));
}

const handleV2PaymentVerification = (req, res, postData) => {
  res.setHeader("Content-Type", "application/payment-verification")
  res.writeHead(200)
  const data = {
    payment: {
      currency: postData.currency,
      chain: postData.chain,
      transactions: postData.transactions,
    },
    memo: 'Payment Valid'
  }
  res.end(respond(data));
}

const handleV2Payment = (req, res, postData) => {
  console.log('Congrats! The bug has been fixed!')
  res.end(respond({}));
}

const handleV1PaymentRequest = (req, res) => {
  res.setHeader("Content-Type", "application/json")
  res.writeHead(200)
  const expires = new Date()
  expires.setHours((new Date()).getHours() + 1)
  const data = {
    network: 'main',
    currency: 'LTC',
    time: new Date(),
    expires,
    memo,
    "outputs": [{
      amount: sendAmount,
      address,
    }],
    paymentUrl,
    paymentId,
    requiredFeeRate: 1,
  }
  res.end(respond(data));
}

const handleV1Payment = (req, res, postData) => {
  console.log('This is how things used to work! We now know the payment has been sent and can watch for this exact transaction.')
  res.end(respond({}));
}

const server = http.createServer(async (req, res) => {
  const method = req.method
  const acceptHeader = req.headers['accept']
  const contentTypeHeader = req.headers['content-type']
  const payprotoHeader = req.headers['x-paypro-version']
  const requestedHeader = req.headers['x-requested-with']

  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Headers", "*")
  res.setHeader("Access-Control-Allow-Methods", "*")

  if (method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  var version = "unknown"
  if (payprotoHeader === '2') {
    version = 'edge/bitpay v2 - part-working'
  } else if (requestedHeader === 'co.edgesecure.app') {
    version = 'edge/bitpay v1 - working'
  }

  console.log(`Received request ${method} ${acceptHeader || contentTypeHeader} (version ${version})`)

  const bodyPromise = new Promise(resolve => {
    if (method === 'POST') {
      req.on('data', data => {
        const json = JSON.parse(data.toString())
        console.log(`--> ${JSON.stringify(json, null, 4)}`)
        resolve(json)
      })
    } else {
      resolve()
    }
  })
  const postData = await bodyPromise

  if (requestedHeader === 'co.edgesecure.app') {
    if (
      method === 'GET' &&
      acceptHeader === 'application/payment-request'
    ) {
      return handleV1PaymentRequest(req, res)
    }

    if (
      method === 'POST' &&
      contentTypeHeader === 'application/payment'
    ) {
      return handleV1Payment(req, res, postData)
    }
  }

  if (payprotoHeader === '2') {
    if (
      method === 'GET' &&
      acceptHeader === 'application/payment-options'
    ) {
      return handleV2PaymentOptions(req, res)
    }

    if (
      method === 'POST' &&
      contentTypeHeader === 'application/payment-request'
    ) {
      return handleV2PaymentRequest(req, res, postData)
    }

    if (
      method === 'POST' &&
      contentTypeHeader === 'application/payment-verification'
    ) {
      return handleV2PaymentVerification(req, res, postData)
    }

    // TODO: Fix the current edgewallet v2.12.0 so that this request is sent.
    if (
      method === 'POST' &&
      contentTypeHeader === 'application/payment'
    ) {
      return handleV2Payment(req, res)
    }
  }

  return handleUnknownRequest(req, res)
})

server.listen(port)
console.log(`Demo bitpay server started, listening at ${paymentUrl}`)
console.log(`Destination LTC address set to: ${address}`)
console.log('Scan the qr code (using EdgeWallet on the same LAN) for LTC payment:')
console.log('\n' + litecoinPaymentUrl)
qrcode.generate(litecoinPaymentUrl)
