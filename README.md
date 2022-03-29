# Edge Wallet Bitpay Issue Demo

This project contains a simple test v1 and v2 bitpay payment protocol server for
use with EdgeWallet.

It's setup to run against the Litecoin mainnet with a minimal ~USD 0.01
transaction.

The aim is to demonstrate that the final `application/payment` request is sent
on previous versions of the wallet, but not the latest release.

At the time of writing I'm testing:
- Release `v2.12.0`
- Previous commit `5355f84a1` (5 months ago)

## Prerequisites
- Node
- Yarn

## Setup

- Open up `config.json` and set your ip address and litecoin address.
- Ensure your android phone is on the same network and can reach the address 
  configured above.

## Running

```
yarn && yarn start
```

## Explanation

Running with the previous EdgeWallet version and completing the exchange will
result in a final request with the signed transaction data such as:

```json
{
    "chain": "LTC",
    "currency": "LTC",
    "transactions": [
        {
            "tx": "01000000011b0ec6c7efe486a5b728e8620db98c0ac03d96f3feba515b49231c4a209148c90100000000ffffffff02102700000000000017a9144c1da4227db287e8b7c97893b4fd1cba93056bbb8748de33000000000017a914d772195d26fb7817c3171c7a0e1d6855e41ce78e8700000000",
            "weightedSize": 247
        }
    ]
}
```

This is crucial for the merchant server to be able to watch for the transaction
on the network, as well as to broadcast it - both the wallet and merchant
server should broadcast the same transaction according to the spec, in case the
merchant network is more reliable.

If you do the same thing using the v2 protocol and v2.12 wallet, that final
request doesn't seem to be sent.


