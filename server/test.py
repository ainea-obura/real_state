import json
import os

import requests

from requests.auth import HTTPBasicAuth


def token():
    url = "https://sandbox.sasapay.app/api/v1/auth/token/?grant_type=client_credentials"
    params = {"grant_type": "client_credentials"}
    res = requests.get(
        url,
        auth=HTTPBasicAuth(
            "40tcB9ytloIYRTUbuG3LNdYT7TTCc7SYGIeU7T65",
            "gvye9Sk6TnfCQiP7rqaXUQ9aaOohw6AySO0tBLTbybpDuuJrSQmU8dKxfpK9hEI6aTQGYX1scqAgyUWvvUgXBltSXjC7C4JimMDtX3vMzGiSXJZuoONwrsUoV5Va3dsD",
        ),
        params=params,
    )
    response = json.loads(res.text)
    access_token = response["access_token"]
    print(access_token)
    return access_token


def check_lipa(token):
    url = "https://sandbox.sasapay.app/api/v2/waas/payments/pay-bills/"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


    payload = {
        "merchantCode": os.environ.get("TILL_NUMBER"),
        "transactionReference": "YYY-XXX",
        "currencyCode": "KES",
        "amount": 100,
        "senderAccountNumber": "254708374149",
        "receiverMerchantCode": os.environ.get("MERCHANT_CODE"),
        "accountReference": "YYY-XXX",
        "chargeAccount": os.environ.get("TILL_NUMBER"),
        "transactionFee": 0,
        "billerType": "PAYBILL",
        "networkCode": "0",
        "callbackUrl": "https://posthere.io/4bdd-47d5-a54d/callback/",
        "reason": "Payment of bill"
    }

    response = requests.post(url, headers=headers, json=payload)
    return response.json()


resposne = check_lipa(token())

print({
    "status": resposne.get("status"),
    "responseCode": resposne.get("responseCode"),
    "message": resposne.get("message"),
})
